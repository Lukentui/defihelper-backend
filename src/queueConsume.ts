import 'source-map-support/register';
import 'module-alias/register';
import cli from 'command-line-args';
import process from 'process';
import container from './container';

container.model
  .migrationService()
  .up()
  .then(async () => {
    const options = cli([
      { name: 'queue', alias: 'q', type: String, defaultValue: 'tasks_default' },
    ]);
    if (!container.parent.rabbitmq.queues.map(({ name }) => name).includes(options.queue)) {
      throw new Error(`Queue "${options.queue}" not found`);
    }

    container.rabbitmq().on('disconnected', () => {
      throw new Error('Rabbit disconnected');
    });
    const consumer = container.model.queueService().consume({ queue: options.queue });

    process.on('SIGTERM', () => consumer.stop());

    container.logger().info(`Consume "${options.queue}" queue messages`);
  })
  .catch((e) => {
    container.logger().error(e);
    process.exit(1);
  });
