import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { WebhookMessageDto } from './dto/webhook-message.dto';
import { OpenaiService } from '../openai/openai.service';
import { ConversationService } from '../openai/conversation.service';
import { AuthSessionService } from '../openai/auth-session.service';
import { TwilioService } from './twilio.service';
import type { ProcessIncomingMessageResult } from './twilio.service';

const MESSAGE_DELAY_MS = 500;
const NOT_DOCTOR_MESSAGE =
  'El número no está registrado como médico. Contacta al administrador.';

@Injectable()
export class ReplyMessageHandler {
  private readonly logger = new Logger(ReplyMessageHandler.name);

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly conversationService: ConversationService,
    private readonly authSessionService: AuthSessionService,
    @Inject(forwardRef(() => TwilioService))
    private readonly twilioService: TwilioService,
  ) { }

  async handle(
    webhookData: WebhookMessageDto,
  ): Promise<Omit<ProcessIncomingMessageResult, 'alreadyProcessed'>> {
    const doctorInfo = await this.conversationService.findDoctorByPhone(
      webhookData.From,
    );
    if (!doctorInfo) {
      await this.twilioService.sendReply(
        webhookData.To,
        webhookData.From,
        NOT_DOCTOR_MESSAGE,
      );
      return {
        success: true,
        message: 'Mensaje rechazado: número no registrado como médico',
        data: {
          messageSid: webhookData.MessageSid,
          from: webhookData.From,
        },
      };
    }

    await this.twilioService.updateLastInbound(
      webhookData.To,
      webhookData.From,
    );

    this.logger.log('=== MENSAJE RECIBIDO DE WHATSAPP ===');
    this.logger.log(`De: ${webhookData.From}`);
    this.logger.log(`Mensaje: ${webhookData.Body}`);

    const phoneNumber = webhookData.From;
    const userMessage = webhookData.Body;
    const replyFromNumber = webhookData.To;

    let assistantResponse: string;

    const session = await this.authSessionService.getOrCreateSession(
      phoneNumber,
      doctorInfo.doctorId,
    );

    try {
      assistantResponse = await this.openaiService.processMessageFromDoctor(
        phoneNumber,
        userMessage,
        {
          authToken: session.authToken,
          doctorId: doctorInfo.doctorId,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error procesando mensaje con OpenAI: ${this.getErrorMessage(error)}`,
      );
      assistantResponse =
        'Ocurrió un error procesando tu mensaje. Por favor, intenta de nuevo.';
    }

    const messageParts = this.twilioService.splitMessage(assistantResponse);

    for (let i = 0; i < messageParts.length; i++) {
      const result = await this.twilioService.sendReply(
        replyFromNumber,
        phoneNumber,
        messageParts[i],
      );
      this.logger.log(
        `Parte enviada: índice=${i + 1}/${messageParts.length}, messageSid=${result.messageSid ?? 'n/a'}`,
      );

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
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
}
