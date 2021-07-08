import * as Mustache from 'mustache';
import { Templates } from './templates';
import TelegramBot from 'node-telegram-bot-api';
import container from "@container";
import {ContactStatus} from "@models/Notification/Entity";

export type TelegramTemplate = keyof typeof Templates;

export class TelegramService {
    protected bot: TelegramBot;
    constructor(token: string) {
      this.bot = new TelegramBot(token, { polling: !!token });
    }

  startHandler() {
    this.bot.on("message", async message => {
      if (message.text && message.text.indexOf('/start') > -1) {
        const confirmationCode = message.text.replace('/start ', '');
        const userContact = await container.model.userContactTable()
          .where('confirmationCode', confirmationCode)
          .first();
        if (!userContact || userContact.status === ContactStatus.Active) {
          await this.bot.sendMessage(message.chat.id, 'This code has not found');
          return;
        }

        await container.model.userContactService().activate(userContact, message.chat.id.toString());
      }
    });
  }

  async send(template: TelegramTemplate, data: Object, chatId: number): Promise<void> {
    const message = Mustache.render(await Templates[template], data);

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
    });
  }
}

export function telegramServiceFactory(token: string) {
  return () => new TelegramService(token);
}
