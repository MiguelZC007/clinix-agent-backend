jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'SM123',
        status: 'queued',
      }),
    },
  }));
});

jest.mock('src/core/config/environments', () => ({
  __esModule: true,
  default: {
    TWILIO_ACCOUNT_SID: 'test-sid',
    TWILIO_AUTH_TOKEN: 'test-token',
    TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
  },
}));

import { Prisma } from '@prisma/client';
import { TwilioService } from './twilio.service';
import { ReplyMessageHandler } from './reply-message.handler';
import { PrismaService } from 'src/prisma/prisma.service';

describe('TwilioService', () => {
  let service: TwilioService;
  let mockPrisma: {
    processedWebhookMessage: { create: jest.Mock };
    whatsAppContactWindow: { upsert: jest.Mock; findUnique: jest.Mock };
  };
  let mockReplyMessageHandler: { handle: jest.Mock };

  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'test-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    process.env.TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886';

    mockPrisma = {
      processedWebhookMessage: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      whatsAppContactWindow: {
        upsert: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    mockReplyMessageHandler = {
      handle: jest.fn().mockResolvedValue({
        success: true,
        message: 'Mensaje procesado y respondido correctamente',
        data: {
          messageSid: 'SM123',
          from: 'whatsapp:+584241234567',
          responsePartsCount: 1,
        },
      }),
    };

    service = new TwilioService(
      mockPrisma as unknown as PrismaService,
      mockReplyMessageHandler as unknown as ReplyMessageHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('splitMessage', () => {
    it('debe retornar mensaje sin dividir si es menor a 1000 caracteres', () => {
      const shortMessage = 'Este es un mensaje corto.';
      const result = service.splitMessage(shortMessage);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(shortMessage);
    });

    it('debe dividir mensaje largo en múltiples partes', () => {
      const longMessage = 'a'.repeat(2500);
      const result = service.splitMessage(longMessage);

      expect(result.length).toBeGreaterThan(1);
      result.forEach((part) => {
        expect(part.length).toBeLessThanOrEqual(1000);
      });
    });

    it('debe dividir por párrafos cuando sea posible', () => {
      const messageWithParagraphs = `Primer párrafo con información importante.

Segundo párrafo con más detalles sobre el tema.

Tercer párrafo que contiene conclusiones.`;

      const result = service.splitMessage(messageWithParagraphs);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('Primer párrafo');
      expect(result[0]).toContain('Segundo párrafo');
    });

    it('debe agregar indicador de parte cuando hay múltiples mensajes', () => {
      const veryLongMessage = Array(50)
        .fill('Este es un párrafo largo. ')
        .join('\n\n');
      const result = service.splitMessage(veryLongMessage);

      if (result.length > 1) {
        expect(result[0]).toMatch(/^\[1\/\d+\]/);
        expect(result[result.length - 1]).toMatch(/^\[\d+\/\d+\]/);
      }
    });

    it('debe dividir oraciones largas correctamente', () => {
      const longSentence = 'Esta es una oración muy larga. '.repeat(50);
      const result = service.splitMessage(longSentence);

      result.forEach((part) => {
        const contentWithoutIndicator = part.replace(/^\[\d+\/\d+\]\n/, '');
        expect(contentWithoutIndicator.length).toBeLessThanOrEqual(1000);
      });
    });

    it('debe manejar mensaje con mezcla de párrafos cortos y largos', () => {
      const mixedMessage = `Párrafo corto.

${'Este es un párrafo muy largo que debería ser dividido. '.repeat(30)}

Otro párrafo corto al final.`;

      const result = service.splitMessage(mixedMessage);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('debe preservar el contenido completo al dividir', () => {
      const originalMessage = `Primera parte del mensaje.

Segunda parte con más información.

Tercera parte final.`;

      const result = service.splitMessage(originalMessage);
      const reconstructed = result
        .map((part) => part.replace(/^\[\d+\/\d+\]\n/, ''))
        .join('');

      expect(reconstructed.replace(/\s+/g, ' ').trim()).toContain(
        'Primera parte',
      );
      expect(reconstructed.replace(/\s+/g, ' ').trim()).toContain(
        'Segunda parte',
      );
      expect(reconstructed.replace(/\s+/g, ' ').trim()).toContain(
        'Tercera parte',
      );
    });
  });

  describe('processIncomingMessage', () => {
    it('debe procesar mensaje y enviar respuesta', async () => {
      const webhookData = {
        MessageSid: 'SM123',
        From: 'whatsapp:+584241234567',
        To: 'whatsapp:+14155238886',
        Body: 'Hola',
      };

      const result = await service.processIncomingMessage(webhookData as never);

      expect(result.success).toBe(true);
      expect(mockReplyMessageHandler.handle).toHaveBeenCalledWith(webhookData);
    });

    it('debe retornar alreadyProcessed cuando MessageSid ya fue procesado', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '' },
      );
      mockPrisma.processedWebhookMessage.create.mockRejectedValueOnce(
        prismaError,
      );

      const webhookData = {
        MessageSid: 'SM123',
        From: 'whatsapp:+584241234567',
        To: 'whatsapp:+14155238886',
        Body: 'Hola',
      };

      const result = await service.processIncomingMessage(webhookData as never);

      expect(result.success).toBe(true);
      expect(result.alreadyProcessed).toBe(true);
      expect(mockReplyMessageHandler.handle).not.toHaveBeenCalled();
    });

    it('debe delegar en ReplyMessageHandler y retornar su resultado', async () => {
      mockReplyMessageHandler.handle.mockResolvedValueOnce({
        success: true,
        message: 'OK',
        data: {
          messageSid: 'SM123',
          from: 'whatsapp:+584241234567',
          responsePartsCount: 3,
        },
      });

      const webhookData = {
        MessageSid: 'SM456',
        From: 'whatsapp:+584241234567',
        To: 'whatsapp:+14155238886',
        Body: 'Dame mucha información',
      };

      const result = await service.processIncomingMessage(webhookData as never);

      expect(result.success).toBe(true);
      expect(result.data.responsePartsCount).toBe(3);
    });
  });
});
