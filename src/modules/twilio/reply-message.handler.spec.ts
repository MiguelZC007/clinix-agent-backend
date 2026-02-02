import { ReplyMessageHandler } from './reply-message.handler';
import { OpenaiService } from '../openai/openai.service';
import { ConversationService } from '../openai/conversation.service';
import { AuthSessionService } from '../openai/auth-session.service';
import { TwilioService } from './twilio.service';

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

    handler = new ReplyMessageHandler(
      mockOpenaiService as unknown as OpenaiService,
      mockConversationService as unknown as ConversationService,
      mockAuthSessionService as unknown as AuthSessionService,
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
});
