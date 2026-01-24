import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WebhookMessageDto } from './dto/webhook-message.dto';
import { OpenaiService } from '../openai/openai.service';
import twilio from 'twilio';

const MAX_MESSAGE_LENGTH = 990;
const MESSAGE_DELAY_MS = 500;

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private twilioClient: twilio.Twilio;

  constructor(private readonly openaiService: OpenaiService) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      this.logger.error(
        'TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN deben estar configurados en las variables de entorno',
      );
      throw new Error('Configuración de Twilio incompleta');
    }

    this.twilioClient = twilio(accountSid, authToken);
    this.logger.log('Cliente de Twilio inicializado correctamente');
  }

  async processIncomingMessage(webhookData: WebhookMessageDto) {
    try {
      this.logger.log('=== MENSAJE RECIBIDO DE WHATSAPP ===');
      this.logger.log(`De: ${webhookData.From}`);
      this.logger.log(`Mensaje: ${webhookData.Body}`);

      const phoneNumber = webhookData.From;
      const userMessage = webhookData.Body;

      let assistantResponse: string;

      try {
        assistantResponse = await this.openaiService.processMessageFromDoctor(
          phoneNumber,
          userMessage,
        );
      } catch (error) {
        const status = this.getErrorStatus(error);
        if (status === 404) {
          assistantResponse =
            'No estás registrado como médico en el sistema. Por favor, contacta al administrador.';
        } else {
          this.logger.error(
            `Error procesando mensaje con OpenAI: ${this.getErrorMessage(error)}`,
          );
          assistantResponse =
            'Ocurrió un error procesando tu mensaje. Por favor, intenta de nuevo.';
        }
      }

      const messageParts = this.splitMessage(assistantResponse);

      for (let i = 0; i < messageParts.length; i++) {
        await this.sendWhatsAppMessage(phoneNumber, messageParts[i]);

        if (i < messageParts.length - 1) {
          await this.delay(MESSAGE_DELAY_MS);
        }
      }

      this.logger.log('=====================================');

      return {
        success: true,
        message: 'Mensaje procesado y respondido correctamente',
        data: {
          messageSid: webhookData.MessageSid,
          from: webhookData.From,
          responsePartsCount: messageParts.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error procesando mensaje entrante: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
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

  private async sendWhatsAppMessage(to: string, body: string) {
    try {
      const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      this.logger.log(
        `Enviando mensaje de WhatsApp a ${toNumber} (${body.length} chars)`,
      );

      const message = await this.twilioClient.messages.create({
        from: fromNumber,
        to: toNumber,
        body: body,
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
      throw new BadRequestException('twilio-send-failed');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async sendDirectMessage(to: string, body: string) {
    return this.sendWhatsAppMessage(to, body);
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
