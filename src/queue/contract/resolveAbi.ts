import { Process } from '@models/Queue/Entity';
import container from '@container';
import dayjs from 'dayjs';
import {
  contractBlockchainTableName,
  contractTableName,
  MetadataType,
} from '@models/Protocol/Entity';

export interface Params {
  id: string;
}

export default async (process: Process) => {
  const { id } = process.task.params as Params;

  const contractService = container.model.contractService();
  const metadataService = container.model.metadataService();

  const contract = await contractService
    .contractTable()
    .innerJoin(
      contractBlockchainTableName,
      `${contractBlockchainTableName}.id`,
      `${contractTableName}.id`,
    )
    .where(`${contractTableName}.id`, id)
    .first();
  if (!contract || contract.blockchain !== 'ethereum') {
    throw new Error(`Contract "${id}" not found or incompatible`);
  }

  try {
    const network = container.blockchain[contract.blockchain].byNetwork(contract.network);
    const abi = await network.getContractAbi(contract.address);

    await metadataService.createOrUpdate(
      MetadataType.EthereumContractAbi,
      abi,
      contract.blockchain,
      contract.network,
      contract.address,
    );
  } catch (e) {
    if (e.message === 'NOT_VERIFIED') {
      await metadataService.createOrUpdate(
        MetadataType.EthereumContractAbi,
        null,
        contract.blockchain,
        contract.network,
        contract.address,
      );
      return process.done();
    }

    return process.info(e.message).later(dayjs().add(1, 'minute').toDate());
  }

  return process.done();
};
