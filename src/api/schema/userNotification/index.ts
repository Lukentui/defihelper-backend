import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import container from '@container';
import { Request } from 'express';
import * as UserNotification from '@models/UserNotification/Entity';
import { AuthenticationError, UserInputError } from 'apollo-server-express';
import { tableName as userTableName } from '@models/User/Entity';
import { userNotificationTableName } from '@models/UserNotification/Entity';
import { userContactTableName } from '@models/Notification/Entity';
import { UuidType } from '../types';

export const UserNotificationTypeEnum = new GraphQLEnumType({
  name: 'UserNotificationTypeEnum',
  values: Object.values(UserNotification.UserNotificationType).reduce(
    (res, type) => ({ ...res, [type]: { value: type } }),
    {},
  ),
});

export const UserNotificationType = new GraphQLObjectType<UserNotification.UserNotification>({
  name: 'UserNotificationType',
  fields: {
    type: {
      type: GraphQLNonNull(UserNotificationTypeEnum),
      description: 'Type',
    },
    contact: {
      type: GraphQLNonNull(UuidType),
      description: 'Contact',
    },
    time: {
      type: GraphQLNonNull(GraphQLString),
      description: 'Time',
    },
  },
});

export const UserNotificationListQuery: GraphQLFieldConfig<any, Request> = {
  type: GraphQLNonNull(GraphQLList(GraphQLNonNull(UserNotificationType))),
  resolve: async (root, _, { currentUser }) => {
    if (!currentUser) throw new AuthenticationError('UNAUTHENTICATED');

    return container.model
      .userNotificationTable()
      .innerJoin(
        userContactTableName,
        `${userNotificationTableName}.contact`,
        `${userContactTableName}.id`,
      )
      .innerJoin(userTableName, `${userContactTableName}.user`, `${userTableName}.id`)
      .andWhere(`${userTableName}.id`, currentUser.id);
  },
};

export const UserNotificationToggleMutation: GraphQLFieldConfig<any, Request> = {
  type: GraphQLNonNull(GraphQLBoolean),
  args: {
    contact: {
      type: GraphQLNonNull(UuidType),
    },
    type: {
      type: GraphQLNonNull(UserNotificationTypeEnum),
    },
    state: {
      type: GraphQLNonNull(GraphQLBoolean),
    },
  },
  resolve: async (_, { contact: contactId, type, state }, { currentUser }) => {
    if (!currentUser) {
      throw new AuthenticationError('UNAUTHENTICATED');
    }

    const contact = await container.model.userContactTable().where({ id: contactId }).first();
    if (!contact || contact.user !== currentUser.id) {
      throw new UserInputError('Contact not found');
    }

    if (state) {
      await container.model.userNotificationService().enable(contact, type);
      return true;
    }

    await container.model.userNotificationService().disable(contact, type);
    return true;
  },
};
