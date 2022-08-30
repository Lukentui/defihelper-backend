import { Process } from '@models/Queue/Entity';
import container from '@container';
import { DataLoaderContainer } from '@api/dataLoader/container';
import BN from 'bignumber.js';
import { TokenAliasLiquidity } from '@models/Token/Entity';
import { ContactBroker, ContactStatus } from '@models/Notification/Entity';

interface Params {
  notificationId: string;
}

export default async (process: Process) => {
  const { notificationId } = process.task.params as Params;

  const notificationSetting = await container.model
    .userNotificationTable()
    .where({ id: notificationId })
    .first();
  if (!notificationSetting || !notificationSetting.contact) {
    throw new Error('NotificationSetting not found');
  }

  const dataLoader = new DataLoaderContainer({});
  const contact = await container.model
    .userContactTable()
    .where({
      id: notificationSetting.contact,
      status: ContactStatus.Active,
    })
    .first();

  if (!contact) {
    throw new Error('Contact not found');
  }

  const user = await container.model
    .userTable()
    .where({
      id: contact.user,
    })
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  const chatId = contact.params?.chatId;
  if (!chatId) return process.error(new Error('Chat id not found'));

  const [
    {
      stakingUSD: totalStackedUSD,
      earnedUSD: totalEarnedUSD,
      earnedUSDDayBefore,
      stakingUSDDayBefore,
    },
    { usd: totalTokensUSD },
  ] = await Promise.all([
    dataLoader.userMetric().load(contact.user),
    dataLoader
      .userTokenMetric({
        contract: null,
        tokenAlias: { liquidity: [TokenAliasLiquidity.Stable, TokenAliasLiquidity.Unstable] },
      })
      .load(contact.user),
  ]);

  if (!totalStackedUSD) return process.done().info('no totalStackedUSD');
  const totalEarnedUSDFixedFloating = new BN(totalEarnedUSD).toFixed(2);
  const totalNetWorth = new BN(totalStackedUSD)
    .plus(totalEarnedUSD)
    .plus(totalTokensUSD)
    .toFixed(2);

  const totalEarnedChange =
    Number(earnedUSDDayBefore) !== 0
      ? new BN(totalEarnedUSD).div(earnedUSDDayBefore).toString(10)
      : '0';

  const totalEarnedChangePercentage = new BN(totalEarnedChange).minus(1).multipliedBy(100);

  const totalNetWorthChange =
    Number(stakingUSDDayBefore) !== 0
      ? new BN(totalStackedUSD).div(stakingUSDDayBefore).toString(10)
      : '0';

  const totalNetWorthChangePercentage = new BN(totalNetWorthChange).minus(1).multipliedBy(100);

  switch (contact.broker) {
    case ContactBroker.Telegram:
      await container.model.queueService().push('sendTelegramByContact', {
        contactId: contact.id,
        params: {
          name: user.name === '' ? 'My Portfolio' : user.name,
          totalNetWorth,
          totalEarnedUSD: totalEarnedUSDFixedFloating,
          percentageEarned: `${
            totalEarnedChangePercentage.isPositive() ? '+' : ''
          }${totalEarnedChangePercentage.toFixed(2)}`,
          percentageTracked: `${
            totalNetWorthChangePercentage.isPositive() ? '+' : ''
          }${totalNetWorthChangePercentage.toFixed(2)}`,
        },
        template: 'portfolioMetrics',
      });
      break;
    case ContactBroker.Email:
      await container.email().send(
        'portfolioMetrics',
        {
          ...container.template.i18n(container.i18n.byLocale(user.locale)),
          name: user.name === '' ? 'My Portfolio' : user.name,
          totalNetWorth,
          totalEarnedUSD: totalEarnedUSDFixedFloating,
          percentageEarned: `${
            totalEarnedChangePercentage.isPositive() ? '+' : ''
          } ${totalEarnedChangePercentage.toFixed(2)}`,
          percentageTracked: `${
            totalNetWorthChangePercentage.isPositive() ? '+' : ''
          } ${totalNetWorthChangePercentage.toFixed(2)}`,
        },
        'Portfolio statistics',
        contact.address,
      );
      break;
    default:
      throw new Error('Unknown broker');
  }

  return process.done();
};
