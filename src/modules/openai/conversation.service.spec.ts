jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Resumen de prueba' } }],
        }),
      },
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

import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;
  let mockPrisma: {
    user: { findFirst: jest.Mock };
    conversation: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    message: {
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockDoctor = {
    id: 'doctor-uuid',
    userId: 'user-uuid',
    specialtyId: 'specialty-uuid',
    licenseNumber: '12345',
  };

  const mockUser = {
    id: 'user-uuid',
    email: 'doctor@test.com',
    name: 'Juan',
    lastName: 'Pérez',
    phone: '+584241234567',
    doctor: mockDoctor,
  };

  const mockConversation = {
    id: 'conversation-uuid',
    doctorId: 'doctor-uuid',
    model: 'gpt-4',
    systemPrompt: 'Test prompt',
    summary: null,
    lastActivityAt: new Date(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findFirst: jest.fn(),
      },
      conversation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      message: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callbacks) => Promise.all(callbacks)),
    };

    service = new ConversationService(mockPrisma as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findDoctorByPhone', () => {
    it('debe encontrar un doctor por número de teléfono', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findDoctorByPhone('+584241234567');

      expect(result).toEqual({
        doctorId: 'doctor-uuid',
        doctorName: 'Juan Pérez',
      });
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          phone: '+584241234567',
          doctor: { isNot: null },
        },
        include: { doctor: true },
      });
    });

    it('debe normalizar número de teléfono con prefijo whatsapp:', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      await service.findDoctorByPhone('whatsapp:+584241234567');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          phone: '+584241234567',
          doctor: { isNot: null },
        },
        include: { doctor: true },
      });
    });

    it('debe retornar null si no encuentra doctor', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.findDoctorByPhone('+584241234567');

      expect(result).toBeNull();
    });

    it('debe retornar null si usuario no tiene doctor asociado', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, doctor: null });

      const result = await service.findDoctorByPhone('+584241234567');

      expect(result).toBeNull();
    });
  });

  describe('getOrCreateActiveConversation', () => {
    it('debe crear nueva conversación si no existe ninguna activa', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue({
        ...mockConversation,
        messages: [],
      });

      const result = await service.getOrCreateActiveConversation(
        'doctor-uuid',
        'System prompt',
      );

      expect(result.conversation).toBeDefined();
      expect(result.messages).toEqual([]);
      expect(mockPrisma.conversation.create).toHaveBeenCalled();
    });

    it('debe reutilizar conversación existente si está activa y no expirada', async () => {
      const recentConversation = {
        ...mockConversation,
        lastActivityAt: new Date(),
        messages: [
          { id: '1', role: 'user', content: 'Hola', createdAt: new Date() },
          { id: '2', role: 'assistant', content: 'Hola, ¿en qué puedo ayudarte?', createdAt: new Date() },
        ],
      };
      mockPrisma.conversation.findFirst.mockResolvedValue(recentConversation);
      mockPrisma.conversation.update.mockResolvedValue(recentConversation);

      const result = await service.getOrCreateActiveConversation(
        'doctor-uuid',
        'System prompt',
      );

      expect(result.conversation.id).toBe('conversation-uuid');
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conversation-uuid' },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('debe crear nueva conversación si la sesión expiró (más de 30 minutos)', async () => {
      const expiredDate = new Date();
      expiredDate.setMinutes(expiredDate.getMinutes() - 35);

      const expiredConversation = {
        ...mockConversation,
        lastActivityAt: expiredDate,
      };

      mockPrisma.conversation.findFirst.mockResolvedValue(expiredConversation);
      mockPrisma.conversation.update.mockResolvedValue({ ...expiredConversation, isActive: false });
      mockPrisma.conversation.create.mockResolvedValue({
        ...mockConversation,
        id: 'new-conversation-uuid',
        messages: [],
      });

      const result = await service.getOrCreateActiveConversation(
        'doctor-uuid',
        'System prompt',
      );

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conversation-uuid' },
        data: { isActive: false },
      });
      expect(mockPrisma.conversation.create).toHaveBeenCalled();
      expect(result.conversation.id).toBe('new-conversation-uuid');
    });

    it('debe incluir resumen en mensajes de contexto si existe', async () => {
      const conversationWithSummary = {
        ...mockConversation,
        summary: 'Resumen de conversación anterior: Se registró un paciente Juan',
        messages: [
          { id: '1', role: 'user', content: 'Mensaje reciente', createdAt: new Date() },
        ],
      };
      mockPrisma.conversation.findFirst.mockResolvedValue(conversationWithSummary);
      mockPrisma.conversation.update.mockResolvedValue(conversationWithSummary);

      const result = await service.getOrCreateActiveConversation(
        'doctor-uuid',
        'System prompt',
      );

      expect(result.messages[0]).toEqual({
        role: 'system',
        content: expect.stringContaining('Resumen de conversación anterior'),
      });
    });
  });

  describe('addMessage', () => {
    it('debe agregar mensaje a la conversación', async () => {
      const mockMessage = {
        id: 'message-uuid',
        conversationId: 'conversation-uuid',
        role: 'user',
        content: 'Hola',
        tokenCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.message.create.mockResolvedValue(mockMessage);
      mockPrisma.conversation.findUnique.mockResolvedValue({
        ...mockConversation,
        messages: [mockMessage],
      });

      const result = await service.addMessage('conversation-uuid', 'user', 'Hola');

      expect(result).toEqual(mockMessage);
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conversation-uuid',
          role: 'user',
          content: 'Hola',
          tokenCount: expect.any(Number),
        },
      });
    });

    it('debe estimar tokens correctamente', async () => {
      const longMessage = 'a'.repeat(100);
      mockPrisma.message.create.mockResolvedValue({
        id: 'message-uuid',
        tokenCount: 25,
      });
      mockPrisma.conversation.findUnique.mockResolvedValue({
        ...mockConversation,
        messages: [],
      });

      await service.addMessage('conversation-uuid', 'user', longMessage);

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokenCount: 25,
        }),
      });
    });
  });

  describe('closeConversation', () => {
    it('debe marcar conversación como inactiva', async () => {
      mockPrisma.conversation.update.mockResolvedValue({
        ...mockConversation,
        isActive: false,
      });

      await service.closeConversation('conversation-uuid');

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conversation-uuid' },
        data: { isActive: false },
      });
    });
  });

  describe('Ventana deslizante de mensajes', () => {
    it('debe retornar solo los últimos 10 mensajes', async () => {
      const manyMessages = Array.from({ length: 15 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Mensaje ${i}`,
        createdAt: new Date(Date.now() + i * 1000),
      }));

      const conversationWithManyMessages = {
        ...mockConversation,
        messages: manyMessages,
      };

      mockPrisma.conversation.findFirst.mockResolvedValue(conversationWithManyMessages);
      mockPrisma.conversation.update.mockResolvedValue(conversationWithManyMessages);

      const result = await service.getOrCreateActiveConversation(
        'doctor-uuid',
        'System prompt',
      );

      expect(result.messages.length).toBeLessThanOrEqual(10);
    });
  });
});
