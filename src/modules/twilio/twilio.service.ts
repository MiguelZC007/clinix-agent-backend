import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { WebhookMessageDto } from './dto/webhook-message.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReplyMessageHandler } from './reply-message.handler';
import twilio from 'twilio';
import environment from 'src/core/config/environments';
import { Prisma } from '@prisma/client';
import { isE164 } from './validators/phone.validator';

const MAX_MESSAGE_LENGTH = 990;

export interface ProcessIncomingMessageResult {
  success: boolean;
  alreadyProcessed?: boolean;
  message: string;
  data: {
    messageSid: string;
    from: string;
    responsePartsCount?: number;
  };
}

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private twilioClient: twilio.Twilio;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ReplyMessageHandler))
    private readonly replyMessageHandler: ReplyMessageHandler,
  ) {
    const accountSid = environment.TWILIO_ACCOUNT_SID;
    const authToken = environment.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      this.logger.error(
        'TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN deben estar configurados en las variables de entorno',
      );
      throw new Error('Configuración de Twilio incompleta');
    }

    this.twilioClient = twilio(accountSid, authToken);
    this.logger.log('Cliente de Twilio inicializado correctamente');
  }

  async processIncomingMessage(
    webhookData: WebhookMessageDto,
  ): Promise<ProcessIncomingMessageResult> {
    try {
      try {
        await this.prisma.processedWebhookMessage.create({
          data: { messageSid: webhookData.MessageSid },
        });
      } catch (createError) {
        if (
          createError instanceof Prisma.PrismaClientKnownRequestError &&
          createError.code === 'P2002'
        ) {
          this.logger.log(
            `MessageSid ${webhookData.MessageSid} ya procesado, omitiendo`,
          );
          return {
            success: true,
            alreadyProcessed: true,
            message: 'Mensaje ya procesado',
            data: {
              messageSid: webhookData.MessageSid,
              from: webhookData.From,
            },
          };
        }
        throw createError;
      }

      const allowedFromNumbers = this.getAllowedWhatsAppFromNumbers();
      if (!allowedFromNumbers.includes(webhookData.To)) {
        this.logger.warn(
          `Webhook To ${webhookData.To} no está en la lista de números permitidos`,
        );
        throw new BadRequestException('twilio-channel-not-allowed');
      }

      return this.replyMessageHandler.handle(webhookData);
    } catch (error) {
      this.logger.error(
        `Error procesando mensaje entrante: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      try {
        await this.sendReply(
          webhookData.To,
          webhookData.From,
          'Lo sentimos, ocurrió un error procesando tu mensaje. Intenta de nuevo en un momento.',
        );
      } catch (sendError) {
        this.logger.warn(
          `No se pudo enviar mensaje de fallback al usuario: ${this.getErrorMessage(sendError)}`,
        );
      }
      throw new BadRequestException('twilio-incoming-process-failed');
    }
  }

  splitMessage(message: string): string[] {
    if (message.length <= MAX_MESSAGE_LENGTH) {
      return [message];
    }

    const parts: string[] = [];
    const paragraphs = message.split('\n\n');

    let currentPart = '';

    for (const paragraph of paragraphs) {
      if (paragraph.length > MAX_MESSAGE_LENGTH) {
        if (currentPart) {
          parts.push(currentPart.trim());
          currentPart = '';
        }

        const sentences = paragraph.split(/(?<=[.!?])\s+/);

        for (const sentence of sentences) {
          if (sentence.length > MAX_MESSAGE_LENGTH) {
            if (currentPart) {
              parts.push(currentPart.trim());
              currentPart = '';
            }

            let remaining = sentence;
            while (remaining.length > MAX_MESSAGE_LENGTH) {
              let splitIndex = remaining.lastIndexOf(' ', MAX_MESSAGE_LENGTH);
              if (splitIndex === -1) splitIndex = MAX_MESSAGE_LENGTH;

              parts.push(remaining.substring(0, splitIndex).trim());
              remaining = remaining.substring(splitIndex).trim();
            }
            if (remaining) {
              currentPart = remaining;
            }
          } else if (
            (currentPart + ' ' + sentence).length > MAX_MESSAGE_LENGTH
          ) {
            parts.push(currentPart.trim());
            currentPart = sentence;
          } else {
            currentPart = currentPart ? currentPart + ' ' + sentence : sentence;
          }
        }
      } else if (
        (currentPart + '\n\n' + paragraph).length > MAX_MESSAGE_LENGTH
      ) {
        if (currentPart) {
          parts.push(currentPart.trim());
        }
        currentPart = paragraph;
      } else {
        currentPart = currentPart
          ? currentPart + '\n\n' + paragraph
          : paragraph;
      }
    }

    if (currentPart) {
      parts.push(currentPart.trim());
    }

    const totalParts = parts.length;
    if (totalParts > 1) {
      return parts.map(
        (part, index) => `[${index + 1}/${totalParts}]\n${part}`,
      );
    }

    return parts;
  }

  private getAllowedWhatsAppFromNumbers(): string[] {
    const fromEnv = environment.TWILIO_WHATSAPP_FROM;
    if (!fromEnv) return [];
    return [fromEnv.trim()];
  }

  async sendReply(
    fromWhatsAppNumber: string,
    to: string,
    body: string,
  ): Promise<{ success: boolean; messageSid: string | null; status: string }> {
    return this.sendWhatsAppMessageWithFrom(fromWhatsAppNumber, to, body);
  }

  private async sendWhatsAppMessageWithFrom(
    fromNumber: string,
    to: string,
    body: string,
  ): Promise<{ success: boolean; messageSid: string | null; status: string }> {
    if (!this.isValidE164(to)) {
      throw new BadRequestException('invalid-phone-format');
    }
    if (!this.isValidE164(fromNumber)) {
      throw new BadRequestException('invalid-phone-format');
    }
    try {
      const toNormalized = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const fromNormalized = fromNumber.startsWith('whatsapp:')
        ? fromNumber
        : `whatsapp:${fromNumber}`;

      this.logger.log(
        `Enviando mensaje de WhatsApp de ${fromNormalized} a ${toNormalized} (${body.length} chars)`,
      );

      const message = await this.twilioClient.messages.create({
        from: fromNormalized,
        to: toNormalized,
        body,
      });

      this.logger.log(`Mensaje enviado exitosamente. SID: ${message.sid}`);

      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
      };
    } catch (error) {
      this.logger.error(
        `Error enviando mensaje de WhatsApp: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      if (this.isRetryableTwilioError(error)) {
        throw new ServiceUnavailableException('twilio-send-retryable');
      }
      throw new BadRequestException('twilio-send-failed');
    }
  }

  private isValidE164(phone: string): boolean {
    return isE164(phone);
  }

  private isRetryableTwilioError(error: unknown): boolean {
    const status = this.getErrorStatus(error);
    if (status === undefined) return false;
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
    return false;
  }

  private async sendWhatsAppMessage(to: string, body: string) {
    const fromNumber = environment.TWILIO_WHATSAPP_FROM;
    return this.sendWhatsAppMessageWithFrom(fromNumber, to, body);
  }

  async sendDirectMessage(to: string, body: string) {
    return this.sendWhatsAppMessage(to, body);
  }

  async sendProactiveTemplate(
    fromNumber: string,
    to: string,
    contentSid: string,
    contentVariables?: Record<string, string>,
  ): Promise<{
    success: boolean;
    messageSid: string | null;
    status: string;
  }> {
    if (!this.isValidE164(to) || !this.isValidE164(fromNumber)) {
      throw new BadRequestException('invalid-phone-format');
    }
    try {
      const toNormalized = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const fromNormalized = fromNumber.startsWith('whatsapp:')
        ? fromNumber
        : `whatsapp:${fromNumber}`;

      this.logger.log(
        `Enviando plantilla WhatsApp de ${fromNormalized} a ${toNormalized} (contentSid: ${contentSid})`,
      );

      const createParams: {
        from: string;
        to: string;
        contentSid: string;
        contentVariables?: string;
      } = {
        from: fromNormalized,
        to: toNormalized,
        contentSid,
      };
      if (
        contentVariables &&
        Object.keys(contentVariables).length > 0
      ) {
        createParams.contentVariables = JSON.stringify(contentVariables);
      }

      const message = await this.twilioClient.messages.create(createParams);

      this.logger.log(`Plantilla enviada exitosamente. SID: ${message.sid}`);

      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
      };
    } catch (error) {
      this.logger.error(
        `Error enviando plantilla WhatsApp: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      if (this.isRetryableTwilioError(error)) {
        throw new ServiceUnavailableException('twilio-send-template-retryable');
      }
      throw new BadRequestException('twilio-send-template-failed');
    }
  }

  async updateLastInbound(channelNumber: string, userPhone: string): Promise<void> {
    await this.prisma.whatsAppContactWindow.upsert({
      where: {
        channelNumber_userPhone: {
          channelNumber,
          userPhone,
        },
      },
      create: {
        channelNumber,
        userPhone,
      },
      update: {
        lastInboundAt: new Date(),
      },
    });
  }

  async isWithin24h(
    channelNumber: string,
    userPhone: string,
  ): Promise<boolean> {
    const row = await this.prisma.whatsAppContactWindow.findUnique({
      where: {
        channelNumber_userPhone: {
          channelNumber,
          userPhone,
        },
      },
    });
    if (!row) return false;
    const hoursSince = (Date.now() - row.lastInboundAt.getTime()) / (1000 * 60 * 60);
    return hoursSince < 24;
  }

  async getMessageStatus(messageSid: string) {
    try {
      const message = await this.twilioClient.messages(messageSid).fetch();

      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        price: message.price,
        priceUnit: message.priceUnit,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error) {
      this.logger.error(
        `Error obteniendo estado del mensaje: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw new BadRequestException('twilio-status-fetch-failed');
    }
  }

  private getErrorStatus(error: unknown): number | undefined {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status?: unknown }).status;
      return typeof status === 'number' ? status : undefined;
    }
    return undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      return typeof message === 'string' ? message : 'Unknown error';
    }
    return 'Unknown error';
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
