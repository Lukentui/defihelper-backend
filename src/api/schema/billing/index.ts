import container from '@container';
import { Request } from 'express';
import { AuthenticationError, UserInputError } from 'apollo-server-express';
import { User } from '@models/User/Entity';
import {
  Wallet,
  WalletBlockchain,
  walletBlockchainTableName,
  walletTableName,
} from '@models/Wallet/Entity';
import { withFilter } from 'graphql-subscriptions';
import {
  Bill,
  BillStatus,
  Transfer,
  transferTableName,
  billTableName,
} from '@models/Billing/Entity';
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  GraphQLFieldConfig,
} from 'graphql';
import BN from 'bignumber.js';
import {
  BlockchainEnum,
  BlockchainFilterInputType,
  DateTimeType,
  PaginateList,
  PaginationArgument,
  SortArgument,
  UuidType,
} from '../types';

export const BillStatusEnum = new GraphQLEnumType({
  name: 'BillingBillStatusEnum',
  values: {
    [BillStatus.Pending]: {
      description: 'Bill awaiting confirmation',
    },
    [BillStatus.Accepted]: {
      description: 'Bill accepted',
    },
    [BillStatus.Rejected]: {
      description: 'Bill rejected',
    },
  },
});

export const BillType = new GraphQLObjectType<Bill>({
  name: 'BillingBillType',
  fields: {
    id: {
      type: GraphQLNonNull(UuidType),
      description: 'Identificator',
    },
    blockchain: {
      type: GraphQLNonNull(BlockchainEnum),
      description: 'Blockchain type',
    },
    network: {
      type: GraphQLNonNull(GraphQLString),
      description: 'Blockchain network id',
    },
    account: {
      type: GraphQLNonNull(GraphQLString),
      description: 'Account',
    },
    claimant: {
      type: GraphQLNonNull(GraphQLString),
      description: 'Claimant',
    },
    claimGasFee: {
      type: GraphQLNonNull(GraphQLFloat),
      description: 'Declarate gas fee',
    },
    claimProtocolFee: {
      type: GraphQLNonNull(GraphQLFloat),
      description: 'Declarate protocol fee',
    },
    gasFee: {
      type: GraphQLFloat,
      description: 'Confirmed gas fee',
    },
    protocolFee: {
      type: GraphQLFloat,
      description: 'Confirmed protocol fee',
    },
    claim: {
      type: GraphQLNonNull(GraphQLFloat),
      description: 'Balance of claim after make the bill',
    },
    status: {
      type: GraphQLNonNull(BillStatusEnum),
      description: 'Current status',
    },
    tx: {
      type: GraphQLNonNull(GraphQLString),
      description: 'Transaction id',
    },
    createdAt: {
      type: GraphQLNonNull(DateTimeType),
      description: 'Date of created',
    },
    updatedAt: {
      type: GraphQLNonNull(DateTimeType),
      description: 'Date of last updated',
    },
  },
});

export const TransferType = new GraphQLObjectType<Transfer>({
  name: 'BillingTransferType',
  fields: {
    id: {
      type: GraphQLNonNull(UuidType),
      description: 'Identificator',
    },
    blockchain: {
      type: GraphQLNonNull(BlockchainEnum),
      description: 'Blockchain type',
    },
    network: {
      type: GraphQLNonNull(GraphQLString),
      description: 'Blockchain network id',
    },
    account: {
      type: GraphQLNonNull(GraphQLString),
      description: 'Account',
    },
    amount: {
      type: GraphQLNonNull(GraphQLFloat),
      description: 'Transfer amount (must be negative)',
    },
    tx: {
      type: GraphQLNonNull(GraphQLString),
      description: 'Transaction id',
    },
    bill: {
      type: BillType,
      description: 'Bill',
      resolve: ({ bill }) => {
        return bill ? container.model.billingBillTable().where('id', bill).first() : null;
      },
    },
    confirmed: {
      type: GraphQLNonNull(GraphQLBoolean),
      description: 'Is transfer confirmed',
    },
    createdAt: {
      type: GraphQLNonNull(DateTimeType),
      description: 'Date of created',
    },
  },
});

export const BalanceType = new GraphQLObjectType({
  name: 'BillingBalanceType',
  fields: {
    lowFeeFunds: {
      type: GraphQLNonNull(GraphQLBoolean),
    },
    pending: {
      type: GraphQLNonNull(GraphQLFloat),
    },
    balance: {
      type: GraphQLNonNull(GraphQLFloat),
    },
    claim: {
      type: GraphQLNonNull(GraphQLFloat),
    },
    netBalance: {
      type: GraphQLNonNull(GraphQLFloat),
    },
  },
});

export const WalletBillingType = new GraphQLObjectType<Wallet & WalletBlockchain>({
  name: 'WalletBillingType',
  fields: {
    transfers: {
      type: GraphQLNonNull(
        PaginateList('WalletBillingTransferListType', GraphQLNonNull(TransferType)),
      ),
      args: {
        filter: {
          type: new GraphQLInputObjectType({
            name: 'WalletBillingTransferListFilterInputType',
            fields: {
              deposit: {
                type: GraphQLBoolean,
              },
              claim: {
                type: GraphQLBoolean,
              },
              confirmed: {
                type: GraphQLBoolean,
              },
            },
          }),
          defaultValue: {},
        },
        sort: SortArgument(
          'WalletBillingTransferListSortInputType',
          ['id', 'amount', 'createdAt'],
          [{ column: 'createdAt', order: 'asc' }],
        ),
        pagination: PaginationArgument('WalletBillingTransferListPaginationInputType'),
      },
      resolve: async (wallet, { filter, sort, pagination }) => {
        const select = container.model.billingTransferTable().where(function () {
          this.where({
            blockchain: wallet.blockchain,
            network: wallet.network,
            account: wallet.address,
          });
          if (filter.deposit !== undefined) {
            this.andWhere('amount', filter.deposit ? '>=' : '<', 0);
          }
          if (filter.claim !== undefined) {
            if (filter.claim) {
              this.whereNotNull('bill');
            } else {
              this.whereNull('bill');
            }
          }
          if (typeof filter.confirmed === 'boolean') {
            this.where('confirmed', filter.confirmed);
          }
        });

        return {
          list: await select
            .clone()
            .orderBy(sort)
            .limit(pagination.limit)
            .offset(pagination.offset),
          pagination: {
            count: await select.clone().count().first(),
          },
        };
      },
    },
    bills: {
      type: GraphQLNonNull(PaginateList('WalletBillingBillListType', GraphQLNonNull(BillType))),
      args: {
        filter: {
          type: new GraphQLInputObjectType({
            name: 'WalletBillingBillListFilterInputType',
            fields: {
              status: {
                type: BillStatusEnum,
              },
            },
          }),
          defaultValue: {},
        },
        sort: SortArgument(
          'WalletBillingBillListSortInputType',
          ['id', 'updatedAt', 'createdAt'],
          [{ column: 'updatedAt', order: 'asc' }],
        ),
        pagination: PaginationArgument('WalletBillingBillListPaginationInputType'),
      },
      resolve: async (wallet, { filter, sort, pagination }) => {
        const select = container.model.billingBillTable().where(function () {
          this.where({
            blockchain: wallet.blockchain,
            network: wallet.network,
            account: wallet.address,
          });
          if (filter.status !== undefined) {
            this.andWhere('status', filter.status);
          }
        });

        return {
          list: await select
            .clone()
            .orderBy(sort)
            .limit(pagination.limit)
            .offset(pagination.offset),
          pagination: {
            count: await select.clone().count().first(),
          },
        };
      },
    },
    balance: {
      type: GraphQLNonNull(BalanceType),
      resolve: async (wallet) => {
        const [transferSum, billSum, activeAutomates] = await Promise.all([
          container.model
            .billingTransferTable()
            .sum('amount')
            .where({
              blockchain: wallet.blockchain,
              network: wallet.network,
              account: wallet.address,
            })
            .first(),
          container.model
            .billingBillTable()
            .sum('claim')
            .where({
              blockchain: wallet.blockchain,
              network: wallet.network,
              account: wallet.address,
            })
            .first(),
          container.model
            .automateTriggerTable()
            .where({
              wallet: wallet.id,
              active: true,
            })
            .count()
            .first(),
        ]);
        const balance = transferSum?.sum || 0;
        const claim = billSum?.sum || 0;
        const activeAutomatesCount = activeAutomates?.count || 0;

        if (wallet.blockchain !== 'ethereum' || activeAutomatesCount < 1) {
          return {
            balance,
            claim,
            netBalance: balance - claim,
            lowFeeFunds: false,
          };
        }

        const chainNativeUSD = new BN(
          await container.blockchain.ethereum.byNetwork(wallet.network).nativeTokenPrice(),
        ).toNumber();

        return {
          balance,
          claim,
          netBalance: balance - claim,
          lowFeeFunds: balance * chainNativeUSD - (1 + chainNativeUSD * 0.1) <= 0,
        };
      },
    },
  },
});

export const UserBillingType = new GraphQLObjectType<User>({
  name: 'UserBillingType',
  fields: {
    transfers: {
      type: GraphQLNonNull(
        PaginateList('UserBillingTransferListType', GraphQLNonNull(TransferType)),
      ),
      args: {
        filter: {
          type: new GraphQLInputObjectType({
            name: 'UserBillingTransferListFilterInputType',
            fields: {
              blockchain: {
                type: BlockchainFilterInputType,
              },
              deposit: {
                type: GraphQLBoolean,
              },
              claim: {
                type: GraphQLBoolean,
              },
              wallet: {
                type: GraphQLList(GraphQLNonNull(UuidType)),
              },
              confirmed: {
                type: GraphQLBoolean,
              },
            },
          }),
          defaultValue: {},
        },
        sort: SortArgument(
          'UserBillingTransferListSortInputType',
          ['id', 'amount', 'createdAt'],
          [{ column: 'createdAt', order: 'asc' }],
        ),
        pagination: PaginationArgument('UserBillingTransferListPaginationInputType'),
      },
      resolve: async (user, { filter, sort, pagination }) => {
        const select = container.model
          .billingTransferTable()
          .innerJoin(walletBlockchainTableName, function () {
            this.on(
              `${walletBlockchainTableName}.blockchain`,
              '=',
              `${transferTableName}.blockchain`,
            )
              .andOn(`${walletBlockchainTableName}.network`, '=', `${transferTableName}.network`)
              .andOn(`${walletBlockchainTableName}.address`, '=', `${transferTableName}.account`);
          })
          .innerJoin(walletTableName, `${walletTableName}.id`, `${walletBlockchainTableName}.id`)
          .where(function () {
            this.where(`${walletTableName}.user`, user.id);
            if (filter.blockchain) {
              const { protocol, network } = filter.blockchain;
              this.andWhere(`${walletBlockchainTableName}.blockchain`, protocol);
              if (network !== undefined) {
                this.andWhere(`${walletBlockchainTableName}.network`, network);
              }
            }
            if (filter.deposit !== undefined) {
              this.andWhere(`${transferTableName}.amount`, filter.deposit ? '>=' : '<', 0);
            }
            if (filter.claim !== undefined) {
              if (filter.claim) {
                this.whereNotNull(`${transferTableName}.bill`);
              } else {
                this.whereNull(`${transferTableName}.bill`);
              }
            }
            if (Array.isArray(filter.wallet) && filter.wallet.length > 0) {
              this.whereIn(`${walletTableName}.id`, filter.wallet);
            }
            if (typeof filter.confirmed === 'boolean') {
              this.where(`${transferTableName}.confirmed`, filter.confirmed);
            }
          });

        return {
          list: await select
            .clone()
            .distinct(`${transferTableName}.*`)
            .orderBy(sort)
            .limit(pagination.limit)
            .offset(pagination.offset),
          pagination: {
            count: await select.clone().countDistinct(`${transferTableName}.id`).first(),
          },
        };
      },
    },
    bills: {
      type: GraphQLNonNull(PaginateList('UserBillingBillListType', GraphQLNonNull(BillType))),
      args: {
        filter: {
          type: new GraphQLInputObjectType({
            name: 'UserBillingBillListFilterInputType',
            fields: {
              blockchain: {
                type: BlockchainFilterInputType,
              },
              status: {
                type: BillStatusEnum,
              },
            },
          }),
          defaultValue: {},
        },
        sort: SortArgument(
          'UserBillingBillListSortInputType',
          ['id', 'updatedAt', 'createdAt'],
          [{ column: 'updatedAt', order: 'asc' }],
        ),
        pagination: PaginationArgument('UserBillingBillListPaginationInputType'),
      },
      resolve: async (user, { filter, sort, pagination }) => {
        const select = container.model
          .billingBillTable()
          .innerJoin(walletTableName, function () {
            this.on(`${walletBlockchainTableName}.blockchain`, '=', `${billTableName}.blockchain`)
              .andOn(`${walletBlockchainTableName}.network`, '=', `${billTableName}.network`)
              .andOn(`${walletTableName}.address`, '=', `${billTableName}.account`);
          })
          .where(function () {
            this.where(`${walletTableName}.user`, user.id);
            if (filter.blockchain) {
              const { protocol, network } = filter.blockchain;
              this.andWhere(`${walletBlockchainTableName}.blockchain`, protocol);
              if (network !== undefined) {
                this.andWhere(`${walletBlockchainTableName}.network`, network);
              }
            }
            if (filter.status !== undefined) {
              this.andWhere(`${billTableName}.status`, filter.status);
            }
          });

        return {
          list: await select
            .clone()
            .distinct(`${billTableName}.*`)
            .orderBy(sort)
            .limit(pagination.limit)
            .offset(pagination.offset),
          pagination: {
            count: await select.clone().countDistinct(`${billTableName}.id`).first(),
          },
        };
      },
    },
    balance: {
      type: GraphQLNonNull(BalanceType),
      resolve: async (user) => {
        const [transferUnconfirmedSum, transferConfirmedSum, billSum] = await Promise.all([
          container.model
            .billingTransferTable()
            .sum('amount')
            .innerJoin(walletTableName, function () {
              this.on(
                `${walletBlockchainTableName}.blockchain`,
                '=',
                `${transferTableName}.blockchain`,
              )
                .andOn(`${walletBlockchainTableName}.network`, '=', `${transferTableName}.network`)
                .andOn(`${walletTableName}.address`, '=', `${transferTableName}.account`);
            })
            .where(`${walletTableName}.user`, user.id)
            .where(`${transferTableName}.confirmed`, false)
            .first(),
          container.model
            .billingTransferTable()
            .sum('amount')
            .innerJoin(walletTableName, function () {
              this.on(
                `${walletBlockchainTableName}.blockchain`,
                '=',
                `${transferTableName}.blockchain`,
              )
                .andOn(`${walletBlockchainTableName}.network`, '=', `${transferTableName}.network`)
                .andOn(`${walletTableName}.address`, '=', `${transferTableName}.account`);
            })
            .where(`${walletTableName}.user`, user.id)
            .where(`${transferTableName}.confirmed`, true)
            .first(),
          container.model
            .billingBillTable()
            .sum('claim')
            .innerJoin(walletTableName, function () {
              this.on(`${walletBlockchainTableName}.blockchain`, '=', `${billTableName}.blockchain`)
                .andOn(`${walletBlockchainTableName}.network`, '=', `${billTableName}.network`)
                .andOn(`${walletTableName}.address`, '=', `${billTableName}.account`);
            })
            .where(`${walletTableName}.user`, user.id)
            .first(),
        ]);
        const pending = transferUnconfirmedSum?.sum || 0;
        const balance = transferConfirmedSum?.sum || 0;
        const claim = billSum?.sum || 0;

        return {
          pending,
          balance,
          claim,
          netBalance: balance - claim,
        };
      },
    },
  },
});

export const BalanceMetaType = new GraphQLObjectType({
  name: 'BalanceMetaType',
  fields: {
    token: {
      type: GraphQLNonNull(GraphQLString),
    },
    recomendedIncome: {
      type: GraphQLNonNull(GraphQLString),
    },
    priceUSD: {
      type: GraphQLNonNull(GraphQLString),
    },
  },
});

export const BalanceMetaQuery: GraphQLFieldConfig<any, Request> = {
  type: GraphQLNonNull(BalanceMetaType),
  args: {
    blockchain: {
      type: GraphQLNonNull(BlockchainEnum),
    },
    network: {
      type: GraphQLNonNull(GraphQLString),
      description: 'Chain ID',
    },
  },
  resolve: async (root, { blockchain, network }) => {
    if (blockchain === 'ethereum') {
      const provider = container.blockchain.ethereum.byNetwork(network);
      return {
        token: provider.nativeTokenDetails.symbol,
        recomendedIncome: '1',
        priceUSD: await provider.nativeTokenPrice(),
      };
    }
    if (blockchain === 'waves') {
      return {
        token: 'WAVES',
        recomendedIncome: '1',
        priceUSD: '0', // todo: price feed call
      };
    }
    throw new UserInputError('Invalid blockchain');
  },
};

export const AddTransferMutation: GraphQLFieldConfig<any, Request> = {
  type: GraphQLNonNull(TransferType),
  args: {
    input: {
      type: GraphQLNonNull(
        new GraphQLInputObjectType({
          name: 'BillingTransferCreateInputType',
          fields: {
            blockchain: {
              type: GraphQLNonNull(BlockchainEnum),
            },
            network: {
              type: GraphQLNonNull(GraphQLString),
            },
            account: {
              type: GraphQLNonNull(GraphQLString),
            },
            amount: {
              type: GraphQLNonNull(GraphQLString),
            },
            tx: {
              type: GraphQLNonNull(GraphQLString),
            },
          },
        }),
      ),
    },
  },
  resolve: async (root, { input }, { currentUser }) => {
    if (!currentUser) throw new AuthenticationError('UNAUTHENTICATED');

    const { blockchain, network, account, amount, tx } = input;
    const duplicate = await container.model
      .billingTransferTable()
      .where({
        blockchain,
        network,
        account: blockchain === 'ethereum' ? account.toLowerCase() : account,
      })
      .first();
    if (duplicate) {
      return duplicate;
    }

    const amountFloat = Number(amount);
    if (Number.isNaN(amountFloat)) throw new UserInputError('Invalid amount');

    const updated = await container.model
      .billingService()
      .transfer(
        blockchain,
        network,
        blockchain === 'ethereum' ? account.toLowerCase() : account,
        amountFloat,
        tx,
        false,
        new Date(),
        null,
      );

    return updated;
  },
};

export const OnTransferCreated: GraphQLFieldConfig<{ id: string }, Request> = {
  type: GraphQLNonNull(TransferType),
  args: {
    filter: {
      type: new GraphQLInputObjectType({
        name: 'OnTransferCreatedFilterInputType',
        fields: {
          wallet: {
            type: GraphQLList(GraphQLNonNull(UuidType)),
          },
          user: {
            type: GraphQLList(GraphQLNonNull(UuidType)),
          },
        },
      }),
      defaultValue: {},
    },
  },
  subscribe: withFilter(
    () => container.cacheSubscriber('defihelper:channel:onBillingTransferCreated').asyncIterator(),
    async ({ id }, { filter }) => {
      const transfer = await container.model.billingTransferTable().where('id', id).first();
      if (!transfer) return false;
      const wallet = await container.model
        .walletTable()
        .innerJoin(
          walletBlockchainTableName,
          `${walletBlockchainTableName}.id`,
          `${walletTableName}.id`,
        )
        .where({
          blockchain: transfer.blockchain,
          network: transfer.network,
          address:
            transfer.blockchain === 'ethereum' ? transfer.account.toLowerCase() : transfer.account,
        })
        .first();
      if (!wallet) return false;

      let result = true;
      if (Array.isArray(filter.wallet) && filter.wallet.length > 0) {
        result = result && filter.wallet.includes(wallet.id);
      }
      if (Array.isArray(filter.user) && filter.user.length > 0) {
        result = result && filter.user.includes(wallet.user);
      }

      return result;
    },
  ),
  resolve: ({ id }) => {
    return container.model.billingTransferTable().where('id', id).first();
  },
};

export const OnTransferUpdated: GraphQLFieldConfig<{ id: string }, Request> = {
  type: GraphQLNonNull(TransferType),
  args: {
    filter: {
      type: new GraphQLInputObjectType({
        name: 'OnTransferUpdatedFilterInputType',
        fields: {
          wallet: {
            type: GraphQLList(GraphQLNonNull(UuidType)),
          },
          user: {
            type: GraphQLList(GraphQLNonNull(UuidType)),
          },
        },
      }),
      defaultValue: {},
    },
  },
  subscribe: withFilter(
    () => container.cacheSubscriber('defihelper:channel:onBillingTransferUpdated').asyncIterator(),
    async ({ id }, { filter }) => {
      const transfer = await container.model.billingTransferTable().where('id', id).first();
      if (!transfer) return false;
      const wallet = await container.model
        .walletTable()
        .innerJoin(
          walletBlockchainTableName,
          `${walletBlockchainTableName}.id`,
          `${walletTableName}.id`,
        )
        .where({
          blockchain: transfer.blockchain,
          network: transfer.network,
          address:
            transfer.blockchain === 'ethereum' ? transfer.account.toLowerCase() : transfer.account,
        })
        .first();
      if (!wallet) return false;

      let result = true;
      if (Array.isArray(filter.wallet) && filter.wallet.length > 0) {
        result = result && filter.wallet.includes(wallet.id);
      }
      if (Array.isArray(filter.user) && filter.user.length > 0) {
        result = result && filter.user.includes(wallet.user);
      }

      return result;
    },
  ),
  resolve: ({ id }) => {
    return container.model.billingTransferTable().where('id', id).first();
  },
};
