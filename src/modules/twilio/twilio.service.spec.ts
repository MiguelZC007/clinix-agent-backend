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

import { TwilioService } from './twilio.service';
import { OpenaiService } from '../openai/openai.service';

describe('TwilioService', () => {
  let service: TwilioService;
  let mockOpenaiService: { processMessageFromDoctor: jest.Mock };

  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'test-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    process.env.TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886';

    mockOpenaiService = {
      processMessageFromDoctor: jest.fn(),
    };

    service = new TwilioService(mockOpenaiService as unknown as OpenaiService);
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
      const veryLongMessage = Array(50).fill('Este es un párrafo largo. ').join('\n\n');
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

      expect(reconstructed.replace(/\s+/g, ' ').trim()).toContain('Primera parte');
      expect(reconstructed.replace(/\s+/g, ' ').trim()).toContain('Segunda parte');
      expect(reconstructed.replace(/\s+/g, ' ').trim()).toContain('Tercera parte');
    });
  });

  describe('processIncomingMessage', () => {
    it('debe procesar mensaje y enviar respuesta', async () => {
      mockOpenaiService.processMessageFromDoctor.mockResolvedValue(
        'Respuesta del asistente',
      );

      const webhookData = {
        MessageSid: 'SM123',
        From: 'whatsapp:+584241234567',
        To: 'whatsapp:+14155238886',
        Body: 'Hola',
      };

      const result = await service.processIncomingMessage(webhookData as never);

      expect(result.success).toBe(true);
      expect(mockOpenaiService.processMessageFromDoctor).toHaveBeenCalledWith(
        'whatsapp:+584241234567',
        'Hola',
      );
    });

    it('debe manejar error cuando doctor no está registrado', async () => {
      const notFoundError = new Error('No encontrado');
      (notFoundError as { status?: number }).status = 404;
      mockOpenaiService.processMessageFromDoctor.mockRejectedValue(notFoundError);

      const webhookData = {
        MessageSid: 'SM123',
        From: 'whatsapp:+584241234567',
        To: 'whatsapp:+14155238886',
        Body: 'Hola',
      };

      const result = await service.processIncomingMessage(webhookData as never);

      expect(result.success).toBe(true);
    });

    it('debe manejar errores genéricos de OpenAI', async () => {
      mockOpenaiService.processMessageFromDoctor.mockRejectedValue(
        new Error('Error de API'),
      );

      const webhookData = {
        MessageSid: 'SM123',
        From: 'whatsapp:+584241234567',
        To: 'whatsapp:+14155238886',
        Body: 'Hola',
      };

      const result = await service.processIncomingMessage(webhookData as never);

      expect(result.success).toBe(true);
    });

    it('debe dividir respuestas largas en múltiples mensajes', async () => {
      const longResponse = 'Respuesta muy larga. '.repeat(100);
      mockOpenaiService.processMessageFromDoctor.mockResolvedValue(longResponse);

      const webhookData = {
        MessageSid: 'SM123',
        From: 'whatsapp:+584241234567',
        To: 'whatsapp:+14155238886',
        Body: 'Dame mucha información',
      };

      const result = await service.processIncomingMessage(webhookData as never);

      expect(result.success).toBe(true);
      expect(result.data.responsePartsCount).toBeGreaterThan(1);
    });
  });
});
