import container from '@container';
import { Process } from '@models/Queue/Entity';
import Binance, { AssetBalance } from 'binance-api-node';
import { WalletSuspenseReason } from '@models/Wallet/Entity';
import BN from 'bignumber.js';

interface Params {
  id: string;
}

export default async (process: Process) => {
  const { id } = process.task.params as Params;

  const exchangeWallet = await container.model.walletExchangeTable().where('id', id).first();

  if (!exchangeWallet) {
    throw new Error('wallet not found');
  }

  const keyPair = container.cryptography().decryptJson(exchangeWallet.payload);

  const binance = Binance({
    apiKey: keyPair?.apiKey,
    apiSecret: keyPair?.apiSecret,
  });

  let spotAssetsList: AssetBalance[];
  let prices: { [key: string]: string };
  try {
    spotAssetsList = (await binance.accountInfo()).balances;
    prices = await binance.prices();
  } catch (e) {
    await container.model
      .walletService()
      .suspense(exchangeWallet.id, WalletSuspenseReason.CexUnableToAuthorize);

    console.warn(e);
    return process.error(e).info('Wallet freezed');
  }

  const resolveTokenPrice = (symbol: string) => {
    return ['USDT', 'BUSD'].map((bridge) => prices[symbol + bridge]).find((v) => v);
  };
  const assetsOnBalance = spotAssetsList
    .filter((v) => !new BN(v.free).plus(v.locked).isZero())
    .map((v) => {
      const bridgedPrice = resolveTokenPrice(v.asset);

      if (bridgedPrice) {
        return {
          symbol: v.asset,
          amount: new BN(v.free).plus(v.locked).multipliedBy(bridgedPrice).toString(10),
        };
      }

      return {
        symbol: v.asset, // stablecoin
        amount: new BN(v.free).plus(v.locked).multipliedBy(1).toString(10),
      };
    });

  console.warn(assetsOnBalance);

  return process.done();
};
