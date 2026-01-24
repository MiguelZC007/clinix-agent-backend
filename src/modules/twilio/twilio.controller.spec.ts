import { Test, TestingModule } from '@nestjs/testing';
import { TwilioController } from './twilio.controller';
import { TwilioService } from './twilio.service';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
import type { Request, Response } from 'express';

describe('TwilioController', () => {
  let controller: TwilioController;
  type MockTwilioService = {
    sendDirectMessage: jest.MockedFunction<
      (this: void, to: string, body: string) => Promise<unknown>
    >;
    processIncomingMessage: jest.MockedFunction<
      (this: void, webhookData: unknown) => Promise<unknown>
    >;
    getMessageStatus: jest.MockedFunction<
      (this: void, messageSid: string) => Promise<unknown>
    >;
  };
  let service: MockTwilioService;

  beforeEach(async () => {
    const mockService: MockTwilioService = {
      sendDirectMessage: jest.fn(),
      processIncomingMessage: jest.fn(),
      getMessageStatus: jest.fn(),
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
    it('debe llamar a twilioService.sendDirectMessage', async () => {
      const dto: SendWhatsAppMessageDto = {
        to: '+584241234567',
        body: 'Test message',
      };

      const mockResponse = {
        success: true,
        messageSid: 'SM123',
        status: 'queued',
      };

      service.sendDirectMessage.mockResolvedValue(mockResponse as never);

      const result = await controller.sendWhatsAppMessage(dto);

      expect(service.sendDirectMessage).toHaveBeenCalledWith(dto.to, dto.body);
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

      const mockRequest = { body: webhookData } as Request;
      type MockResponse = {
        status: jest.MockedFunction<(this: void, code: number) => MockResponse>;
        json: jest.MockedFunction<(this: void, body: unknown) => void>;
      };
      const mockResponse: MockResponse = {
        status: jest.fn<MockResponse, [number]>(),
        json: jest.fn<void, [unknown]>(),
      };
      mockResponse.status.mockImplementation(() => mockResponse);

      const processResult = {
        success: true,
        message: 'Mensaje procesado correctamente',
        data: { messageSid: 'SM123' },
      };

      service.processIncomingMessage.mockResolvedValue(processResult as never);

      await controller.receiveWhatsAppMessage(
        webhookData,
        mockRequest,
        mockResponse as unknown as Response,
      );

      expect(service.processIncomingMessage).toHaveBeenCalledWith(webhookData);
      expect(mockResponse.status.mock.calls[0]?.[0]).toBe(200);
      expect(mockResponse.json.mock.calls[0]?.[0]).toEqual(processResult);
    });

    it('debe manejar errores del webhook', async () => {
      const webhookData = {};
      const mockRequest = { body: webhookData } as Request;
      type MockResponse = {
        status: jest.MockedFunction<(this: void, code: number) => MockResponse>;
        json: jest.MockedFunction<(this: void, body: unknown) => void>;
      };
      const mockResponse: MockResponse = {
        status: jest.fn<MockResponse, [number]>(),
        json: jest.fn<void, [unknown]>(),
      };
      mockResponse.status.mockImplementation(() => mockResponse);

      service.processIncomingMessage.mockRejectedValue(new Error('Test error'));

      await controller.receiveWhatsAppMessage(
        webhookData,
        mockRequest,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status.mock.calls[0]?.[0]).toBe(500);
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
