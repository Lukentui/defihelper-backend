import container from '@container';
import dayjs from 'dayjs';
import { Emitter } from '@services/Event';
import { Factory } from '@services/Container';
import { v4 as uuid } from 'uuid';
import { Protocol } from '@models/Protocol/Entity';
import { Wallet, Table as WalletTable } from '@models/Wallet/Entity';
import { ScannerService } from '@services/Scanner';
import {
  Action,
  ActionParams,
  ActionTable,
  ActionType,
  AutomateTransaction,
  AutomateTransactionData,
  Condition,
  ConditionParams,
  ConditionTable,
  ConditionType,
  Contract,
  ContractTable,
  ContractVerificationStatus,
  TransactionTable,
  Trigger,
  TriggerTable,
  TriggerType,
  TriggerTypes,
} from './Entity';

export class AutomateService {
  public readonly onTriggerCreated = new Emitter<Trigger>(async (trigger) => {
    if (trigger.type === TriggerType.ContractEvent) {
      const callback = await this.scanner().registerCallback(
        trigger.params.network,
        trigger.params.address,
        trigger.params.event,
        `${container.parent.api.internalUrl}/callback/trigger/${trigger.id}?secret=${container.parent.api.secret}`,
      );
      await this.updateTrigger({
        ...trigger,
        params: {
          ...trigger.params,
          callback: callback.id,
        },
      });
    }
  });

  public readonly onTriggerDeleted = new Emitter<Trigger>(async (trigger) => {
    if (trigger.type === TriggerType.ContractEvent) {
      if (trigger.params.callback) {
        await this.scanner().deleteCallback(trigger.params.callback);
      }
    }
  });

  public readonly onContractCreated = new Emitter<{ wallet: Wallet; contract: Contract }>(
    ({ wallet, contract }) => {
      if (wallet.blockchain === 'ethereum') {
        container.model.queueService().push('automateContractEthereumVerify', {
          id: contract.id,
        });
      }
    },
  );

  public readonly onTransactionCreated = new Emitter<{
    wallet: Wallet;
    contract: Contract;
    transaction: AutomateTransaction;
  }>(async ({ wallet, transaction }) => {
    if (wallet.blockchain === 'ethereum') {
      container.model.queueService().push(
        'automateTransactionEthereumConfirm',
        {
          id: transaction.id,
        },
        {
          startAt: dayjs().add(1, 'minutes').toDate(),
        },
      );
    }
  });

  constructor(
    readonly triggerTable: Factory<TriggerTable>,
    readonly conditionTable: Factory<ConditionTable>,
    readonly actionTable: Factory<ActionTable>,
    readonly contractTable: Factory<ContractTable>,
    readonly transactionTable: Factory<TransactionTable>,
    readonly walletTable: Factory<WalletTable>,
    readonly scanner: Factory<ScannerService>,
  ) {}

  async createTrigger(wallet: Wallet, type: TriggerTypes, name: string, active: boolean = true) {
    const created: Trigger = {
      id: uuid(),
      wallet: wallet.id,
      ...type,
      name,
      active,
      lastCallAt: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    await this.triggerTable().insert(created);
    this.onTriggerCreated.emit(created);

    return created;
  }

  async updateTrigger(trigger: Trigger) {
    const updated: Trigger = {
      ...trigger,
      updatedAt: new Date(),
    };
    await this.triggerTable().where({ id: trigger.id }).update(updated);

    return updated;
  }

  async deleteTrigger(trigger: Trigger) {
    await this.triggerTable().where({ id: trigger.id }).delete();
    this.onTriggerDeleted.emit(trigger);
  }

  async createCondition(
    trigger: Trigger,
    type: ConditionType,
    params: ConditionParams<ConditionType>,
    priority: number,
  ) {
    const created: Condition = {
      id: uuid(),
      trigger: trigger.id,
      type,
      params,
      priority,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    await this.conditionTable().insert(created);

    return created;
  }

  async updateCondition(condition: Condition) {
    const updated: Condition = {
      ...condition,
      updatedAt: new Date(),
    };
    await this.conditionTable().where({ id: condition.id }).update(updated);

    return updated;
  }

  async deleteCondition(condition: Condition) {
    await this.conditionTable().where({ id: condition.id }).delete();
  }

  async createAction(
    trigger: Trigger,
    type: ActionType,
    params: ActionParams<ActionType>,
    priority: number,
  ) {
    const created: Action = {
      id: uuid(),
      trigger: trigger.id,
      type,
      params,
      priority,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    await this.actionTable().insert(created);

    return created;
  }

  async updateAction(action: Action) {
    const updated: Action = {
      ...action,
      updatedAt: new Date(),
    };
    await this.actionTable().where({ id: action.id }).update(updated);

    return updated;
  }

  async deleteAction(action: Action) {
    await this.actionTable().where({ id: action.id }).delete();
  }

  async createContract(
    wallet: Wallet,
    protocol: Protocol,
    address: string,
    adapter: string,
    initParams: Object,
  ) {
    const created: Contract = {
      id: uuid(),
      wallet: wallet.id,
      protocol: protocol.id,
      address,
      adapter,
      initParams,
      verification: ContractVerificationStatus.Pending,
      rejectReason: '',
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    await this.contractTable().insert(created);
    this.onContractCreated.emit({ wallet, contract: created });

    return created;
  }

  async updateContract(contract: Contract) {
    const updated: Contract = {
      ...contract,
      updatedAt: new Date(),
    };
    await this.contractTable().where({ id: contract.id }).update(updated);

    return updated;
  }

  async deleteContract(contract: Contract) {
    await this.contractTable().where({ id: contract.id }).delete();
  }

  async createTransaction<T extends AutomateTransactionData>(
    contract: Contract,
    consumer: string,
    data: T,
  ) {
    const wallet = await this.walletTable().where('id', contract.wallet).first();
    if (!wallet) throw new Error('Wallet not found');

    const created: AutomateTransaction = {
      id: uuid(),
      contract: contract.id,
      consumer,
      data,
      confirmed: false,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    await this.transactionTable().insert(created);
    this.onTransactionCreated.emit({ wallet, contract, transaction: created });

    return created;
  }

  async updateTransaction(transaction: AutomateTransaction) {
    const updated: AutomateTransaction = {
      ...transaction,
      updatedAt: new Date(),
    };
    await this.transactionTable().where({ id: transaction.id }).update(updated);

    return updated;
  }

  async deleteTransaction(transaction: AutomateTransaction) {
    await this.transactionTable().where({ id: transaction.id }).delete();
  }
}
