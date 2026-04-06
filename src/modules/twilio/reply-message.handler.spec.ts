import { ReplyMessageHandler } from './reply-message.handler';
import { OpenaiService } from '../openai/openai.service';
import { ConversationService } from '../openai/conversation.service';
import { TwilioService } from './twilio.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ReplyMessageHandler', () => {
  let handler: ReplyMessageHandler;
  let mockOpenaiService: { processMessageFromDoctor: jest.Mock };
  let mockConversationService: { findDoctorByPhone: jest.Mock };
  let mockTwilioService: {
    updateLastInbound: jest.Mock;
    sendReply: jest.Mock;
    sendProactiveTemplate: jest.Mock;
    splitMessage: jest.Mock;
    isWithin24h: jest.Mock;
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
    mockTwilioService = {
      updateLastInbound: jest.fn().mockResolvedValue(undefined),
      sendReply: jest.fn().mockResolvedValue({
        success: true,
        messageSid: 'SMout',
        status: 'queued',
      }),
      sendProactiveTemplate: jest.fn().mockResolvedValue({
        success: true,
        messageSid: 'SMtemplate',
        status: 'queued',
      }),
      splitMessage: jest.fn((text: string) => [text]),
      isWithin24h: jest.fn().mockResolvedValue(true),
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
      expect(mockOpenaiService.processMessageFromDoctor).toHaveBeenCalledWith(
        webhookData.From,
        webhookData.Body,
        {
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

  describe('24h window behavior', () => {
    const webhookDataDoctor = {
      MessageSid: 'SM123',
      From: 'whatsapp:+584241234567',
      To: 'whatsapp:+14155238886',
      Body: 'Hola',
    };

    const templateSid = 'TEST_TEMPLATE_SID';

    beforeEach(() => {
      mockTwilioService.isWithin24h.mockClear();
      mockTwilioService.sendReply.mockClear();
      mockTwilioService.sendProactiveTemplate.mockClear();
      process.env.TWILIO_SESSION_EXPIRATION_TEMPLATE_SID = templateSid;
    });

    afterEach(() => {
      // Clean up env var if it was set by this test
      if (process.env.TWILIO_SESSION_EXPIRATION_TEMPLATE_SID !== undefined) {
        delete process.env.TWILIO_SESSION_EXPIRATION_TEMPLATE_SID;
      }
    });

    it('should use sendReply when isWithin24h returns true (within window)', async () => {
      mockTwilioService.isWithin24h.mockResolvedValue(true);

      await handler.handle(webhookDataDoctor as never);

      expect(mockTwilioService.isWithin24h).toHaveBeenCalledWith(
        webhookDataDoctor.To,
        webhookDataDoctor.From,
      );
      expect(mockTwilioService.sendReply).toHaveBeenCalledWith(
        webhookDataDoctor.To,
        webhookDataDoctor.From,
        'Respuesta del asistente',
      );
      expect(mockTwilioService.sendProactiveTemplate).not.toHaveBeenCalled();
    });

    it('should use sendProactiveTemplate when isWithin24h returns false (outside window)', async () => {
      mockTwilioService.isWithin24h.mockResolvedValue(false);

      await handler.handle(webhookDataDoctor as never);

      expect(mockTwilioService.isWithin24h).toHaveBeenCalledWith(
        webhookDataDoctor.To,
        webhookDataDoctor.From,
      );
      expect(mockTwilioService.sendProactiveTemplate).toHaveBeenCalledWith(
        webhookDataDoctor.To,
        webhookDataDoctor.From,
        templateSid,
      );
      expect(mockTwilioService.sendReply).not.toHaveBeenCalled();
    });

    it('should fallback to sendReply when sendProactiveTemplate throws', async () => {
      mockTwilioService.isWithin24h.mockResolvedValue(false);
      mockTwilioService.sendProactiveTemplate.mockRejectedValueOnce(
        new Error('Template send failed'),
      );

      await handler.handle(webhookDataDoctor as never);

      expect(mockTwilioService.sendProactiveTemplate).toHaveBeenCalledTimes(1);
      expect(mockTwilioService.sendReply).toHaveBeenCalledTimes(1);
      expect(mockTwilioService.sendReply).toHaveBeenCalledWith(
        webhookDataDoctor.To,
        webhookDataDoctor.From,
        'Respuesta del asistente',
      );
    });

    it('should default to sendProactiveTemplate when isWithin24h throws (fail-safe)', async () => {
      mockTwilioService.isWithin24h.mockRejectedValue(
        new Error('24h check failed'),
      );

      await handler.handle(webhookDataDoctor as never);

      expect(mockTwilioService.sendProactiveTemplate).toHaveBeenCalledWith(
        webhookDataDoctor.To,
        webhookDataDoctor.From,
        templateSid,
      );
      expect(mockTwilioService.sendReply).not.toHaveBeenCalled();
    });

    it('should skip message send and return error when TWILIO_SESSION_EXPIRATION_TEMPLATE_SID is not configured', async () => {
      delete process.env.TWILIO_SESSION_EXPIRATION_TEMPLATE_SID;
      mockTwilioService.isWithin24h.mockResolvedValue(false);

      const result = await handler.handle(webhookDataDoctor as never);

      expect(result.success).toBe(false);
      expect(result.message).toContain('TWILIO_SESSION_EXPIRATION_TEMPLATE_SID');
      expect(mockTwilioService.sendProactiveTemplate).not.toHaveBeenCalled();
      expect(mockTwilioService.sendReply).not.toHaveBeenCalled();
    });
  });
});
