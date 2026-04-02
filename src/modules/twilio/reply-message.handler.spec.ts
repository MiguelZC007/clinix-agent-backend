import { ReplyMessageHandler } from './reply-message.handler';
import { OpenaiService } from '../openai/openai.service';
import { ConversationService } from '../openai/conversation.service';
import { AuthSessionService } from '../openai/auth-session.service';
import { TwilioService } from './twilio.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ReplyMessageHandler', () => {
  let handler: ReplyMessageHandler;
  let mockOpenaiService: { processMessageFromDoctor: jest.Mock };
  let mockConversationService: { findDoctorByPhone: jest.Mock };
  let mockAuthSessionService: { getOrCreateSession: jest.Mock };
  let mockTwilioService: {
    updateLastInbound: jest.Mock;
    sendReply: jest.Mock;
    splitMessage: jest.Mock;
  };
  let mockPrismaService: {
    doctor: {
      findUnique: jest.Mock;
    };
  };

  const webhookData = {
    MessageSid: 'SM123',
    From: 'whatsapp:+584241234567',
    To: 'whatsapp:+14155238886',
    Body: 'Hola',
  };

  beforeEach(() => {
    mockOpenaiService = {
      processMessageFromDoctor: jest.fn().mockResolvedValue('Respuesta del asistente'),
    };
    mockConversationService = {
      findDoctorByPhone: jest.fn().mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      }),
    };
    mockAuthSessionService = {
      getOrCreateSession: jest.fn().mockResolvedValue({
        authToken: 'token-abc',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }),
    };
    mockTwilioService = {
      updateLastInbound: jest.fn().mockResolvedValue(undefined),
      sendReply: jest.fn().mockResolvedValue({
        success: true,
        messageSid: 'SMout',
        status: 'queued',
      }),
      splitMessage: jest.fn((text: string) => [text]),
    };
    mockPrismaService = {
      doctor: {
        findUnique: jest.fn().mockResolvedValue({
          user: { isActive: true },
        }),
      },
    };

    handler = new ReplyMessageHandler(
      mockOpenaiService as unknown as OpenaiService,
      mockConversationService as unknown as ConversationService,
      mockAuthSessionService as unknown as AuthSessionService,
      mockPrismaService as unknown as PrismaService,
      mockTwilioService as unknown as TwilioService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when From is not a doctor', () => {
    it('should not call processMessageFromDoctor and should send safe message via Twilio', async () => {
      mockConversationService.findDoctorByPhone.mockResolvedValueOnce(null);

      const result = await handler.handle(webhookData as never);

      expect(mockConversationService.findDoctorByPhone).toHaveBeenCalledWith(
        webhookData.From,
      );
      expect(mockOpenaiService.processMessageFromDoctor).not.toHaveBeenCalled();
      expect(mockTwilioService.sendReply).toHaveBeenCalledWith(
        webhookData.To,
        webhookData.From,
        'El número no está registrado como médico. Contacta al administrador.',
      );
      expect(mockTwilioService.updateLastInbound).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.messageSid).toBe(webhookData.MessageSid);
      expect(result.data.from).toBe(webhookData.From);
    });
  });

  describe('when From is a doctor', () => {
    it('should call processMessageFromDoctor and send response via Twilio', async () => {
      const result = await handler.handle(webhookData as never);

      expect(mockConversationService.findDoctorByPhone).toHaveBeenCalledWith(
        webhookData.From,
      );
      expect(mockPrismaService.doctor.findUnique).toHaveBeenCalledWith({
        where: { id: 'doctor-uuid' },
        include: { user: { select: { isActive: true } } },
      });
      expect(mockAuthSessionService.getOrCreateSession).toHaveBeenCalledWith(
        webhookData.From,
        'doctor-uuid',
      );
      expect(mockOpenaiService.processMessageFromDoctor).toHaveBeenCalledWith(
        webhookData.From,
        webhookData.Body,
        {
          authToken: 'token-abc',
          doctorId: 'doctor-uuid',
        },
      );
      expect(mockTwilioService.updateLastInbound).toHaveBeenCalledWith(
        webhookData.To,
        webhookData.From,
      );
      expect(mockTwilioService.sendReply).toHaveBeenCalledWith(
        webhookData.To,
        webhookData.From,
        'Respuesta del asistente',
      );
      expect(result.success).toBe(true);
      expect(result.data.responsePartsCount).toBe(1);
    });
  });

  describe('when doctor account is disabled', () => {
    it('should send rejection message and not process the message', async () => {
      mockPrismaService.doctor.findUnique.mockResolvedValueOnce({
        user: { isActive: false },
      });

      const result = await handler.handle(webhookData as never);

      expect(mockPrismaService.doctor.findUnique).toHaveBeenCalledWith({
        where: { id: 'doctor-uuid' },
        include: { user: { select: { isActive: true } } },
      });
      expect(mockOpenaiService.processMessageFromDoctor).not.toHaveBeenCalled();
      expect(mockTwilioService.sendReply).toHaveBeenCalledWith(
        webhookData.To,
        webhookData.From,
        'Tu cuenta ha sido deshabilitada. Contacta al administrador.',
      );
      expect(mockTwilioService.updateLastInbound).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Mensaje rechazado: cuenta de médico deshabilitada',
      );
    });

    it('should send rejection message when doctor is not found', async () => {
      mockPrismaService.doctor.findUnique.mockResolvedValueOnce(null);

      const result = await handler.handle(webhookData as never);

      expect(mockOpenaiService.processMessageFromDoctor).not.toHaveBeenCalled();
      expect(mockTwilioService.sendReply).toHaveBeenCalledWith(
        webhookData.To,
        webhookData.From,
        'Tu cuenta ha sido deshabilitada. Contacta al administrador.',
      );
      expect(result.success).toBe(true);
    });
  });
});
