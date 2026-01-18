const mockCreate = jest.fn().mockResolvedValue({
  id: 'response-id',
  model: 'gpt-4',
  output: [{ type: 'message', content: 'Test response' }],
});

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    responses: {
      create: mockCreate,
    },
  })),
}));

jest.mock('src/core/config/environments', () => ({
  __esModule: true,
  default: {
    OPENAI_API_KEY: 'test-api-key',
    OPENAI_MODEL: 'gpt-4',
  },
}));

import { OpenaiService } from './openai.service';

describe('OpenaiService', () => {
  let service: OpenaiService;
  let mockPrisma: { conversation: { findFirst: jest.Mock } };

  beforeEach(() => {
    mockPrisma = {
      conversation: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    service = new OpenaiService(mockPrisma as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('conversation', () => {
    it('debe enviar un mensaje y retornar respuesta', async () => {
      const result = await service.conversation('doctor-uuid', {
        message: 'Hola',
      });

      expect(result).toBeDefined();
      expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith({
        where: { doctorId: 'doctor-uuid' },
      });
    });
  });

  describe('sendMessage', () => {
    it('debe llamar a la API de OpenAI con instrucciones y mensaje', async () => {
      const result = await service.sendMessage('Test instructions', {
        message: 'Test message',
      });

      expect(result).toBeDefined();
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
