import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
import { WebhookMessageDto } from './dto/webhook-message.dto';

const mockTwilioClient = {
  messages: {
    create: jest.fn(),
  },
};

jest.mock('twilio', () => {
  return jest.fn(() => mockTwilioClient);
});

describe('TwilioService', () => {
  let service: TwilioService;

  beforeEach(async () => {
    process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    process.env.TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886';

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TwilioService],
    }).compile();

    service = module.get<TwilioService>(TwilioService);
  });

  afterEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WHATSAPP_FROM;
  });

  describe('sendWhatsAppMessage', () => {
    it('debe enviar un mensaje exitosamente', async () => {
      const dto: SendWhatsAppMessageDto = {
        to: '+584241234567',
        body: 'Test message',
      };

      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'SM123',
        status: 'queued',
        to: 'whatsapp:+584241234567',
        from: 'whatsapp:+14155238886',
        body: 'Test message',
        dateCreated: new Date(),
        price: null,
        priceUnit: null,
      });

      const result = await service.sendWhatsAppMessage(dto);

      expect(result.success).toBe(true);
      expect(result.messageSid).toBe('SM123');
    });

    it('debe lanzar BadRequestException en caso de error', async () => {
      const dto: SendWhatsAppMessageDto = {
        to: '+584241234567',
        body: 'Test message',
      };

      mockTwilioClient.messages.create.mockRejectedValue(
        new Error('Twilio error'),
      );

      await expect(service.sendWhatsAppMessage(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processIncomingMessage', () => {
    it('debe procesar un mensaje entrante exitosamente', async () => {
      const webhookData: WebhookMessageDto = {
        MessageSid: 'SM123',
        AccountSid: 'AC123',
        From: 'whatsapp:+584241234567',
        To: 'whatsapp:+14155238886',
        Body: 'Hola',
      };

      const result = await service.processIncomingMessage(webhookData);

      expect(result.success).toBe(true);
      expect(result.data.messageSid).toBe('SM123');
    });

    it('debe procesar mensaje con media', async () => {
      const webhookData: WebhookMessageDto = {
        MessageSid: 'SM123',
        AccountSid: 'AC123',
        From: 'whatsapp:+584241234567',
        To: 'whatsapp:+14155238886',
        Body: 'Imagen',
        NumMedia: 1,
        MediaUrl0: 'https://example.com/image.jpg',
        MediaContentType0: 'image/jpeg',
      };

      const result = await service.processIncomingMessage(webhookData);

      expect(result.success).toBe(true);
      expect(result.data.hasMedia).toBe(true);
    });
  });

  describe('scaffold methods', () => {
    it('create debe retornar mensaje', () => {
      expect(service.create({} as never)).toBe('This action adds a new twilio');
    });

    it('findAll debe retornar mensaje', () => {
      expect(service.findAll()).toBe('This action returns all twilio');
    });

    it('findOne debe retornar mensaje con ID', () => {
      expect(service.findOne(1)).toBe('This action returns a #1 twilio');
    });

    it('update debe retornar mensaje con ID', () => {
      expect(service.update(1, {} as never)).toBe(
        'This action updates a #1 twilio',
      );
    });

    it('remove debe retornar mensaje con ID', () => {
      expect(service.remove(1)).toBe('This action removes a #1 twilio');
    });
  });
});
