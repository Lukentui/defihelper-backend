import container from '@container';
import { actionTableName, contractTableName, triggerTableName } from '@models/Automate/Entity';

export default async () => {
  const triggers = await container.model
    .automateTriggerTable()
    .distinct(`${triggerTableName}.*`)
    .innerJoin(actionTableName, `${triggerTableName}.id`, `${actionTableName}.trigger`)
    .leftJoin(contractTableName, function () {
      this.on(
        `${contractTableName}.id`,
        container.database().raw(`${actionTableName}.params->>'id'`),
      );
    })
    .where(`${actionTableName}.type`, 'ethereumAutomateRun')
    .whereNull(`${contractTableName}.id`);
  await container.model
    .automateTriggerTable()
    .delete()
    .whereIn(
      'id',
      triggers.map(({ id }) => id),
    );
};
