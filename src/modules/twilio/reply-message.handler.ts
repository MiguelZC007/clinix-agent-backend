import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { WebhookMessageDto } from './dto/webhook-message.dto';
import { OpenaiService } from '../openai/openai.service';
import { ConversationService } from '../openai/conversation.service';
import { TwilioService } from './twilio.service';
import { PrismaService } from 'src/prisma/prisma.service';
import type { ProcessIncomingMessageResult } from './twilio.service';

// Delay between sending WhatsApp message parts to avoid rate limiting
const MESSAGE_PART_DELAY_MS = 500;
const NOT_DOCTOR_MESSAGE =
  'El número no está registrado como médico. Contacta al administrador.';
const ACCOUNT_DISABLED_MESSAGE =
  'Tu cuenta ha sido deshabilitada. Contacta al administrador.';

@Injectable()
export class ReplyMessageHandler {
  private readonly logger = new Logger(ReplyMessageHandler.name);

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly conversationService: ConversationService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TwilioService))
    private readonly twilioService: TwilioService,
  ) {}

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

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorInfo.doctorId },
      include: { user: { select: { isActive: true } } },
    });
    if (!doctor?.user.isActive) {
      await this.twilioService.sendReply(
        webhookData.To,
        webhookData.From,
        ACCOUNT_DISABLED_MESSAGE,
      );
      return {
        success: true,
        message: 'Mensaje rechazado: cuenta de médico deshabilitada',
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

    const userMessage = webhookData.Body ?? '';
    this.logger.log('=== MENSAJE RECIBIDO DE WHATSAPP ===');
    this.logger.log(`De: ${webhookData.From}`);
    this.logger.log(`Mensaje: ${userMessage || '(vacío o solo media)'}`);

    const phoneNumber = webhookData.From;
    const replyFromNumber = webhookData.To;

    let assistantResponse: string;

    try {
      assistantResponse = await this.openaiService.processMessageFromDoctor(
        phoneNumber,
        userMessage,
        {
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

    // 24h window check: within window → free-text reply, outside → proactive template
    let within24h: boolean;
    try {
      within24h = await this.twilioService.isWithin24h(
        replyFromNumber,
        phoneNumber,
      );
    } catch (error) {
      this.logger.error(
        `24h window check failed, defaulting to template: ${this.getErrorMessage(error)}`,
      );
      within24h = false;
    }

    const messageParts = this.twilioService.splitMessage(assistantResponse);
    const sentMessageSids: (string | null)[] = [];

    // Validate env var once when outside 24h window (Issue #1)
    const templateSid =
      process.env.TWILIO_SESSION_EXPIRATION_TEMPLATE_SID?.trim();
    const useProactiveTemplate = !within24h;

    if (useProactiveTemplate && !templateSid) {
      this.logger.error(
        `TWILIO_SESSION_EXPIRATION_TEMPLATE_SID is not configured. Cannot send proactive template for ${phoneNumber}. Skipping message send.`,
      );
      // Don't fallback — skip entirely when env var is missing
      return {
        success: false,
        message:
          'TWILIO_SESSION_EXPIRATION_TEMPLATE_SID no está configurado. Mensaje no enviado.',
        data: {
          messageSid: webhookData.MessageSid,
          from: webhookData.From,
        },
      };
    }

    for (let i = 0; i < messageParts.length; i++) {
      let result: { messageSid: string | null };
      let via: string;

      if (within24h) {
        try {
          result = await this.twilioService.sendReply(
            replyFromNumber,
            phoneNumber,
            messageParts[i],
          );
          via = 'sendReply';
        } catch (error) {
          this.logger.error(
            `sendReply failed for part ${i + 1}: ${this.getErrorMessage(error)}`,
          );
          result = { messageSid: null };
          via = 'sendReply';
        }
      } else {
        // Use pre-validated templateSid (Issue #1)
        try {
          result = await this.twilioService.sendProactiveTemplate(
            replyFromNumber,
            phoneNumber,
            templateSid!,
          );
          via = 'sendProactiveTemplate';
        } catch (error) {
          this.logger.error(
            `Template send failed, falling back to sendReply: ${this.getErrorMessage(error)}`,
          );
          result = await this.twilioService.sendReply(
            replyFromNumber,
            phoneNumber,
            messageParts[i],
          );
          via = 'sendReply'; // Issue #3: correct via after fallback
        }
      }

      sentMessageSids.push(result.messageSid ?? null);
      this.logger.log(
        `Parte enviada: índice=${i + 1}/${messageParts.length}, messageSid=${result.messageSid ?? 'n/a'}, via=${via}`,
      );

      if (i < messageParts.length - 1) {
        await this.delay(MESSAGE_PART_DELAY_MS);
      }
    }

    this.logger.log(
      `Respuesta enviada por Twilio: ${messageParts.length} parte(s), messageSids: [${sentMessageSids.map((s) => s ?? 'n/a').join(', ')}], totalCaracteres: ${assistantResponse.length}`,
    );
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
