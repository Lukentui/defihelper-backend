import { SchemaBuilder } from 'knex';
import { smartTradeOrderTableName } from '@models/SmartTrade/Entity';

export default async (schema: SchemaBuilder) => {
  return schema.alterTable(smartTradeOrderTableName, (table) => {
    table.jsonb('balances').notNullable().defaultTo('{}');
  });
};
