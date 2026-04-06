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

import { Logger } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import {
  ContextBudgetExceededError,
  ConversationService,
} from './conversation.service';

interface MockPrisma {
  user: { findFirst: jest.Mock };
  conversation: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  message: {
    create: jest.Mock;
    deleteMany: jest.Mock;
    findMany: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
}

describe('ConversationService', () => {
  let service: ConversationService;
  let prisma: MockPrisma;

  const baseConversation = {
    id: 'conversation-uuid',
    doctorId: 'doctor-uuid',
    model: 'gpt-4',
    systemPrompt: 'Prompt clínico base',
    summary: null,
    contextTokenLimitOverride: null,
    lastActivityAt: new Date(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };

  beforeEach(() => {
    prisma = {
      user: { findFirst: jest.fn() },
      conversation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      message: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((operations) => Promise.all(operations)),
    };

    service = new ConversationService(prisma as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('calcula el effectiveContextLimit desde el perfil del modelo', () => {
    expect(service.getEffectiveContextLimit(null, 'gpt-4')).toBe(115_712);
  });

  it('usa el override menor cuando existe', () => {
    expect(service.getEffectiveContextLimit(32_000, 'gpt-4')).toBe(32_000);
  });

  it('protege contra overrides por debajo del piso mínimo', () => {
    expect(service.getEffectiveContextLimit(1_000, 'gpt-4')).toBe(4_096);
  });

  it('retorna uso de contexto con override persistido', async () => {
    const result = await service.computeContextTokenUsage({
      ...baseConversation,
      contextTokenLimitOverride: 24_000,
      messages: [
        {
          id: 'msg-1',
          content: 'Mensaje clínico',
          role: 'user',
          tokenCount: 25,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          conversationId: 'conversation-uuid',
        },
      ],
    });

    expect(result.contextTokenLimit).toBe(24_000);
    expect(result.contextTokenLimitOverride).toBe(24_000);
    expect(result.contextTokensUsed).toBeGreaterThan(25);
  });

  it('compacta por presión de presupuesto aunque no haya umbral viejo de mensajes', async () => {
    const conversationBeforeCompaction = {
      ...baseConversation,
      contextTokenLimitOverride: 16_000,
      messages: Array.from({ length: 6 }, (_, index) => ({
        id: `msg-${index}`,
        content: `Mensaje ${index}`,
        role: index % 2 === 0 ? 'user' : 'assistant',
        tokenCount: 3_000,
        readAt: null,
        createdAt: new Date(Date.now() + index * 1000),
        updatedAt: new Date(),
        conversationId: 'conversation-uuid',
      })),
    };
    const conversationAfterCompaction = {
      ...conversationBeforeCompaction,
      summary: 'Resumen de prueba',
      messages: conversationBeforeCompaction.messages.slice(-4),
    };

    prisma.conversation.findUnique
      .mockResolvedValueOnce(conversationBeforeCompaction)
      .mockResolvedValueOnce(conversationAfterCompaction)
      .mockResolvedValueOnce(conversationAfterCompaction);
    prisma.conversation.update.mockResolvedValue(conversationAfterCompaction);
    prisma.message.deleteMany.mockResolvedValue({ count: 2 });

    const result = await service.preflightContextBudget(baseConversation.id, [
      {
        role: 'assistant',
        content: 'Payload de herramienta muy grande '.repeat(200),
      },
    ]);

    expect(prisma.conversation.update).toHaveBeenCalled();
    expect(prisma.message.deleteMany).toHaveBeenCalled();
    expect(result.messages[0]?.role).toBe('system');
    expect(result.messages[0]?.content).toContain(
      'Resumen de la conversación anterior',
    );
  });

  it('continúa sin compactar cuando el prompt proyectado queda bajo presupuesto', async () => {
    const underBudgetConversation = {
      ...baseConversation,
      contextTokenLimitOverride: 32_000,
      messages: [
        {
          id: 'msg-1',
          content: 'Mensaje breve',
          role: 'user',
          tokenCount: 40,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          conversationId: 'conversation-uuid',
        },
      ],
    };

    prisma.conversation.findUnique.mockResolvedValue(underBudgetConversation);

    const result = await service.preflightContextBudget(baseConversation.id, [
      { role: 'assistant', content: 'Respuesta breve' },
    ]);

    expect(prisma.conversation.update).not.toHaveBeenCalled();
    expect(prisma.message.deleteMany).not.toHaveBeenCalled();
    expect(result.contextTokensUsed).toBeLessThan(result.contextTokenLimit);
    expect(result.messages).toEqual([
      { role: 'user', content: 'Mensaje breve' },
    ]);
  });

  it('presupuesta metadata estructurada de tool calls en pendingMessages', async () => {
    const underBudgetConversation = {
      ...baseConversation,
      contextTokenLimitOverride: 32_000,
      messages: [],
    };

    prisma.conversation.findUnique.mockResolvedValue(underBudgetConversation);

    const withoutMetadata = await service.preflightContextBudget(
      baseConversation.id,
      [{ role: 'assistant', content: null }],
    );
    const withMetadata = await service.preflightContextBudget(
      baseConversation.id,
      [
        {
          role: 'assistant',
          content: null,
          metadata: JSON.stringify({
            tool_calls: [
              {
                id: 'call-1',
                type: 'function',
                function: {
                  name: 'list_specialties',
                  arguments: '{"query":"cardiología"}',
                },
              },
            ],
          }),
        },
      ],
    );

    expect(withMetadata.contextTokensUsed).toBeGreaterThan(
      withoutMetadata.contextTokensUsed,
    );
  });

  it('preserva continuidad del resumen y la ventana reciente tras compactar', async () => {
    const messages = Array.from({ length: 8 }, (_, index) => ({
      id: `msg-${index}`,
      content: `Mensaje ${index}`,
      role: index % 2 === 0 ? 'user' : 'assistant',
      tokenCount: 3_000,
      readAt: null,
      createdAt: new Date(Date.now() + index * 1000),
      updatedAt: new Date(),
      conversationId: 'conversation-uuid',
    }));
    prisma.conversation.findUnique
      .mockResolvedValueOnce({
        ...baseConversation,
        summary: 'Resumen previo',
        contextTokenLimitOverride: 20_000,
        messages,
      })
      .mockResolvedValueOnce({
        ...baseConversation,
        summary: 'Resumen de prueba',
        contextTokenLimitOverride: 20_000,
        messages: messages.slice(-4),
      })
      .mockResolvedValueOnce({
        ...baseConversation,
        summary: 'Resumen de prueba',
        contextTokenLimitOverride: 20_000,
        messages: messages.slice(-4),
      });
    prisma.conversation.update.mockResolvedValue(baseConversation);
    prisma.message.deleteMany.mockResolvedValue({ count: 4 });

    const result = await service.preflightContextBudget(baseConversation.id, [
      { role: 'assistant', content: 'x'.repeat(2_000) },
    ]);

    const recentMessages = result.messages.filter(
      (message) => message.role !== 'system',
    );
    expect(recentMessages).toHaveLength(4);
    expect(recentMessages[0].content).toBe('Mensaje 4');
    expect(result.messages[0].content).toContain('Resumen de prueba');
  });

  it('lanza fallback controlado si ni compactando entra en presupuesto', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      ...baseConversation,
      contextTokenLimitOverride: 4_096,
      messages: [
        {
          id: 'msg-1',
          content: 'Bloque muy grande',
          role: 'user',
          tokenCount: 10,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          conversationId: 'conversation-uuid',
        },
      ],
    });

    await expect(
      service.preflightContextBudget(baseConversation.id, [
        { role: 'assistant', content: 'z'.repeat(20_000) },
      ]),
    ).rejects.toThrow(ContextBudgetExceededError);
  });

  it('avisa cuando la compactación pierde efecto tras el refetch concurrente', async () => {
    const oversizedConversation = {
      ...baseConversation,
      contextTokenLimitOverride: 16_000,
      messages: Array.from({ length: 6 }, (_, index) => ({
        id: `msg-${index}`,
        content: `Mensaje ${index}`,
        role: index % 2 === 0 ? 'user' : 'assistant',
        tokenCount: 3_000,
        readAt: null,
        createdAt: new Date(Date.now() + index * 1000),
        updatedAt: new Date(),
        conversationId: 'conversation-uuid',
      })),
    };
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    prisma.conversation.findUnique
      .mockResolvedValueOnce(oversizedConversation)
      .mockResolvedValueOnce(oversizedConversation)
      .mockResolvedValueOnce(oversizedConversation);
    prisma.conversation.update.mockResolvedValue(oversizedConversation);
    prisma.message.deleteMany.mockResolvedValue({ count: 2 });

    await expect(
      service.preflightContextBudget(baseConversation.id, [
        { role: 'assistant', content: 'Payload enorme '.repeat(400) },
      ]),
    ).rejects.toThrow(ContextBudgetExceededError);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('did not survive refetch'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('still exceeds the context budget'),
    );
  });

  it('actualiza el override persistido en updateConversation', async () => {
    prisma.conversation.findFirst.mockResolvedValue(baseConversation);
    prisma.conversation.update.mockResolvedValue({
      ...baseConversation,
      contextTokenLimitOverride: 20_000,
    });

    const result = await service.updateConversation(
      baseConversation.id,
      baseConversation.doctorId,
      {
        contextTokenLimitOverride: 20_000,
      },
    );

    expect(prisma.conversation.update).toHaveBeenCalledWith({
      where: { id: baseConversation.id },
      data: { contextTokenLimitOverride: 20_000, model: 'gpt-4' },
    });
    expect(result.contextTokenLimitOverride).toBe(20_000);
  });

  it('lanza NotFound si no existe la conversación al consultar contexto', async () => {
    prisma.conversation.findFirst.mockResolvedValue(null);

    await expect(
      service.getContextForConversation('missing', 'doctor-uuid'),
    ).rejects.toThrow(NotFoundException);
  });
});
