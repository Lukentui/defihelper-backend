import { Blockchain } from '@models/types';
import { v4 as uuid } from 'uuid';
import { Factory } from '@services/Container';
import { User } from '@models/User/Entity';
import { walletBlockchainTableName, walletTableName } from '@models/Wallet/Entity';
import {
  NotificationTable,
  notificationTableName,
  userContactTableName,
} from '@models/Notification/Entity';
import {
  Product,
  ProductCode,
  productTableName,
  ProductTable,
  Purchase,
  PurchaseTable,
  purchaseTableName,
} from './Entity';

export class StoreService {
  constructor(
    readonly productTable: Factory<ProductTable>,
    readonly purchaseTable: Factory<PurchaseTable>,
    readonly notificationTable: Factory<NotificationTable>,
  ) {}

  async create(
    number: number,
    code: ProductCode,
    name: string,
    description: string,
    priceUSD: number,
    amount: number,
  ) {
    const created: Product = {
      id: uuid(),
      number,
      code,
      name,
      description,
      priceUSD,
      amount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.productTable().insert(created);

    return created;
  }

  async update(product: Product) {
    const updated = {
      ...product,
      updatedAt: new Date(),
    };
    await this.productTable().where({ id: product.id }).update(updated);

    return updated;
  }

  async delete(product: Product) {
    await this.productTable().where({ id: product.id }).delete();
  }

  async purchase(
    product: Product,
    blockchain: Blockchain,
    network: string,
    account: string,
    amount: number,
    tx: string,
    createdAt: Date,
  ) {
    const created: Purchase = {
      id: uuid(),
      product: product.id,
      blockchain,
      network,
      account,
      amount,
      tx,
      createdAt,
    };
    await this.purchaseTable().insert(created);

    return created;
  }

  async purchaseAmount(code: ProductCode, user: User): Promise<number> {
    const result = await this.purchaseTable()
      .sum<{ sum: string }>(`${purchaseTableName}.amount`)
      .innerJoin(productTableName, `${purchaseTableName}.product`, '=', `${productTableName}.id`)
      .innerJoin(walletBlockchainTableName, function () {
        this.on(`${walletBlockchainTableName}.blockchain`, '=', `${purchaseTableName}.blockchain`)
          .andOn(`${walletBlockchainTableName}.network`, '=', `${purchaseTableName}.network`)
          .andOn(`${walletBlockchainTableName}.address`, '=', `${purchaseTableName}.account`);
      })
      .innerJoin(walletTableName, `${walletTableName}.id`, `${walletBlockchainTableName}.id`)
      .where(`${productTableName}.code`, code)
      .where(`${walletTableName}.user`, user.id)
      .first();
    if (!result) return 0;

    return parseInt(result.sum, 10);
  }

  async availableNotifications(user: User): Promise<number> {
    const purchaseAmount = await this.purchaseAmount(ProductCode.Notification, user);
    const notificationsCount = await this.notificationTable()
      .countDistinct<{ count: string }>(`${notificationTableName}.id`)
      .innerJoin(
        userContactTableName,
        `${userContactTableName}.id`,
        `${notificationTableName}.contact`,
      )
      .where(`${userContactTableName}.user`, user.id)
      .first()
      .then((row) => Number((row ?? { count: 0 }).count));

    return purchaseAmount - notificationsCount;
  }
}
