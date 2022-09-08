import { Process } from '@models/Queue/Entity';
import container from '@container';
import { TriggerType } from '@models/Automate/Entity';
import dayjs from 'dayjs';

export default async (process: Process) => {
  const queue = container.model.queueService();
  await Promise.all([
    queue.push('systemGarbageCollector', {}),
    queue.push('automateTriggerByTime', { type: TriggerType.EveryDay }),
    queue.push('metricsProtocolLinksSocialBroker', {}),
    queue.push('metricsProtocolLinksListingBroker', {}),
    queue.push('metricsProtocolLinksPostBroker', {}),
    queue.push('metricsContractScannerBroker', {}),
    queue.push('metricsWalletBalancesBroker', {}),
    queue.push('notificationAutomateWalletsNotEnoughFundsBroker', {}),
    queue.push('metricsContractAprWeekRealBroker', {}),
    queue.push('metricsUserBalancesBroker', {}),
    queue.push('metricsWalletBalancesWavesBroker', {}),
    queue.push('migratablePoolsBroker', {}),
    queue.push('metricsWalletProtocolsBalancesDeBankBroker', {}),
    queue.push(
      'migratablePoolsBatch',
      {},
      {
        startAt: dayjs().add(15, 'minutes').toDate(),
      },
    ),
  ]);

  return process.done();
};
