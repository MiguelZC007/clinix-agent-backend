import { Test, TestingModule } from '@nestjs/testing';
import { TwilioController } from './twilio.controller';
import { TwilioService } from './twilio.service';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';

describe('TwilioController', () => {
  let controller: TwilioController;
  let service: jest.Mocked<TwilioService>;

  beforeEach(async () => {
    const mockService = {
      sendWhatsAppMessage: jest.fn(),
      processIncomingMessage: jest.fn(),
      getMessageStatus: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwilioController],
      providers: [{ provide: TwilioService, useValue: mockService }],
    }).compile();

    controller = module.get<TwilioController>(TwilioController);
    service = module.get(TwilioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendWhatsAppMessage', () => {
    it('debe llamar a twilioService.sendWhatsAppMessage', async () => {
      const dto: SendWhatsAppMessageDto = {
        to: '+584241234567',
        body: 'Test message',
      };

      const mockResponse = {
        success: true,
        messageSid: 'SM123',
        status: 'queued',
      };

      service.sendWhatsAppMessage.mockResolvedValue(mockResponse as never);

      const result = await controller.sendWhatsAppMessage(dto);

      expect(service.sendWhatsAppMessage).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('receiveWhatsAppMessage', () => {
    it('debe procesar webhook y retornar respuesta', async () => {
      const webhookData = {
        MessageSid: 'SM123',
        From: 'whatsapp:+584241234567',
        To: 'whatsapp:+14155238886',
        Body: 'Hola',
      };

      const mockRequest = { body: webhookData } as never;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as never;

      const processResult = {
        success: true,
        message: 'Mensaje procesado correctamente',
        data: { messageSid: 'SM123' },
      };

      service.processIncomingMessage.mockResolvedValue(processResult as never);

      await controller.receiveWhatsAppMessage(
        webhookData,
        mockRequest,
        mockResponse,
      );

      expect(service.processIncomingMessage).toHaveBeenCalledWith(webhookData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(processResult);
    });

    it('debe manejar errores del webhook', async () => {
      const webhookData = {};
      const mockRequest = { body: webhookData } as never;
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as never;

      service.processIncomingMessage.mockRejectedValue(new Error('Test error'));

      await controller.receiveWhatsAppMessage(
        webhookData,
        mockRequest,
        mockResponse,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMessageStatus', () => {
    it('debe llamar a twilioService.getMessageStatus', async () => {
      const mockStatus = {
        sid: 'SM123',
        status: 'delivered',
      };

      service.getMessageStatus.mockResolvedValue(mockStatus as never);

      const result = await controller.getMessageStatus('SM123');

      expect(service.getMessageStatus).toHaveBeenCalledWith('SM123');
      expect(result).toEqual(mockStatus);
    });
  });
});
