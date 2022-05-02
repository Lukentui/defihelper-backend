import { Container, singleton } from '@services/Container';
import AppContainer from '@container';
import { User, Role } from '@models/User/Entity';
import { ACL } from './index';

export class ACLContainer extends Container<typeof AppContainer> {
  readonly guest = singleton(
    () =>
      new ACL({
        proposal: ['view'],
      }),
  );

  readonly user = singleton(() =>
    ACL.expand(this.guest(), {
      integration: ['connect', 'disconnect'],
      wallet: ['update-own', 'delete-own'],
      proposal: ['create', 'update-own'],
      protocol: ['view', 'favorite'],
      contract: ['walletLink-own'],
      automateTrigger: ['create', 'update-own', 'delete-own'],
      automateCondition: ['create', 'update-own', 'delete-own'],
      automateAction: ['create', 'update-own', 'delete-own'],
      automateContract: ['create', 'update-own', 'delete-own'],
    }),
  );

  readonly admin = singleton(() =>
    ACL.expand(this.user(), {
      wallet: ['add'],
      user: ['list', 'update'],
      proposal: ['update', 'delete'],
      protocol: ['create', 'update', 'delete'],
      contract: ['create', 'update', 'delete', 'walletLink'],
      product: ['create', 'update', 'delete'],
      token: ['update'],
      tokenAlias: ['create', 'update', 'delete'],
      monitoring: ['view'],
    }),
  );

  readonly byRole = (role: Role) => this[role]();

  readonly byUser = (user?: User) => (user ? this.byRole(user.role) : this.guest());
}
