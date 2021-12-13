import container from '@container';
import { Process } from '@models/Queue/Entity';
import { TokenAliasLiquidity } from '@models/Token/Entity';

export interface Params {
  tokenId: string;
}

export default async (process: Process) => {
  const { tokenId } = process.task.params as Params;

  const tokenService = container.model.tokenService();
  const token = await tokenService.table().where('id', tokenId).first();
  if (!token) throw new Error('Token not found');
  if (token.alias !== null) throw new Error('Token alias already registered');

  const alias = await container.model
    .tokenAliasService()
    .create(token.name, token.symbol, TokenAliasLiquidity.Trash, null);
  await tokenService.update({
    ...token,
    alias: alias.id,
  });

  return process.done();
};
