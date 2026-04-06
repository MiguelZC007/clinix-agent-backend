const mockChatCompletionsCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockChatCompletionsCreate,
      },
    },
  })),
}));

jest.mock('src/core/config/environments', () => ({
  __esModule: true,
  default: {
    OPENAI_API_KEY: 'test-api-key',
    OPENAI_MODEL: 'gpt-4',
    SALT_ROUND: 10,
  },
}));

import { ContextBudgetExceededError } from './conversation.service';
import { OpenaiService } from './openai.service';

interface MockPrisma {
  user: { create: jest.Mock; findFirst: jest.Mock };
  patient: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  specialty: { findMany: jest.Mock; findUnique: jest.Mock };
  appointment: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  clinicHistory: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
}

interface MockConversationService {
  findDoctorByPhone: jest.Mock;
  getOrCreateActiveConversation: jest.Mock;
  preflightContextBudget: jest.Mock;
  addMessage: jest.Mock;
}

describe('OpenaiService budget preflight', () => {
  let service: OpenaiService;
  let prisma: MockPrisma;
  let conversationService: MockConversationService;

  const mockConversation = {
    id: 'conversation-uuid',
    doctorId: 'doctor-uuid',
    model: 'gpt-4',
    systemPrompt: 'Prompt',
  };

  beforeEach(() => {
    mockChatCompletionsCreate.mockReset();

    prisma = {
      user: { create: jest.fn(), findFirst: jest.fn() },
      patient: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      specialty: { findMany: jest.fn(), findUnique: jest.fn() },
      appointment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      clinicHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    conversationService = {
      findDoctorByPhone: jest
        .fn()
        .mockResolvedValue({ doctorId: 'doctor-uuid', doctorName: 'Dr. Test' }),
      getOrCreateActiveConversation: jest
        .fn()
        .mockResolvedValue({ conversation: mockConversation, messages: [] }),
      preflightContextBudget: jest.fn().mockResolvedValue({
        conversation: { ...mockConversation, messages: [] },
        messages: [{ role: 'user', content: 'Hola doctor' }],
        contextTokensUsed: 1200,
        contextTokenLimit: 32000,
        contextTokenLimitOverride: null,
      }),
      addMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
    };

    service = new OpenaiService(
      prisma as never,
      conversationService as never,
      { findTodaysByDoctor: jest.fn() } as never,
      {
        create: jest.fn(),
        createWithoutAppointment: jest.fn(),
      } as never,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('invoca preflight antes de la completion inicial y antes de cada follow-up con tools', async () => {
    conversationService.preflightContextBudget
      .mockResolvedValueOnce({
        conversation: { ...mockConversation, messages: [] },
        messages: [{ role: 'user', content: 'Hola doctor' }],
        contextTokensUsed: 1200,
        contextTokenLimit: 32000,
        contextTokenLimitOverride: null,
      })
      .mockResolvedValueOnce({
        conversation: { ...mockConversation, summary: 'Resumen actualizado' },
        messages: [
          {
            role: 'system',
            content:
              'Resumen de la conversación anterior:\nResumen actualizado',
          },
          { role: 'user', content: 'Contexto compacto vigente' },
        ],
        contextTokensUsed: 900,
        contextTokenLimit: 32000,
        contextTokenLimitOverride: null,
      });

    mockChatCompletionsCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  function: { name: 'list_specialties', arguments: '{}' },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          { message: { content: 'Respuesta final', tool_calls: null } },
        ],
      });
    prisma.specialty.findMany.mockResolvedValue([
      { id: 'spec-1', name: 'Cardiología', specialtyCode: 1 },
    ]);

    const result = await service.processMessageFromDoctor(
      '+584241234567',
      'Necesito las especialidades',
    );

    expect(result).toBe('Respuesta final');
    expect(conversationService.preflightContextBudget).toHaveBeenCalledTimes(2);
    expect(conversationService.preflightContextBudget).toHaveBeenNthCalledWith(
      1,
      'conversation-uuid',
    );
    expect(conversationService.preflightContextBudget).toHaveBeenNthCalledWith(
      2,
      'conversation-uuid',
      expect.any(Array),
    );
    const secondPreflightArgs = conversationService.preflightContextBudget.mock
      .calls[1] as [
      string,
      Array<{ role: string; content: string | null; metadata?: string }>,
    ];
    const pendingPayload = secondPreflightArgs[1];
    const pendingAssistantMessage = pendingPayload.find(
      (message) => message.role === 'assistant',
    );
    const pendingToolMessage = pendingPayload.find(
      (message) => message.role === 'tool',
    );

    expect(pendingAssistantMessage).toBeDefined();
    expect(pendingAssistantMessage?.content).toBeNull();
    expect(pendingAssistantMessage?.metadata).toContain('list_specialties');
    expect(pendingToolMessage).toBeDefined();
    expect(pendingToolMessage?.content).toBe(
      JSON.stringify([{ id: 'spec-1', name: 'Cardiología', specialtyCode: 1 }]),
    );
    expect(pendingToolMessage?.metadata).toContain('call-1');
    const secondCall = mockChatCompletionsCreate.mock.calls.at(1) as unknown;
    const [secondRequest] = secondCall as [
      {
        messages: Array<{
          role: string;
          content?: string | null;
          tool_calls?: unknown;
          tool_call_id?: string;
        }>;
      },
    ];

    expect(secondRequest.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: 'Resumen de la conversación anterior:\nResumen actualizado',
        }),
        expect.objectContaining({
          role: 'user',
          content: 'Contexto compacto vigente',
        }),
      ]),
    );
    expect(secondRequest.messages).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: 'Hola doctor',
        }),
      ]),
    );
    const followUpAssistantMessage = secondRequest.messages.find(
      (message) =>
        message.role === 'assistant' && Array.isArray(message.tool_calls),
    );
    const followUpToolMessage = secondRequest.messages.find(
      (message) => message.role === 'tool' && message.tool_call_id === 'call-1',
    );

    expect(followUpAssistantMessage).toBeDefined();
    expect(followUpAssistantMessage?.content).toBeNull();
    expect(followUpAssistantMessage?.tool_calls).toHaveLength(1);
    expect(
      (
        followUpAssistantMessage?.tool_calls as Array<{
          id: string;
          function: { name: string };
        }>
      )[0],
    ).toMatchObject({
      id: 'call-1',
      function: { name: 'list_specialties' },
    });
    expect(followUpToolMessage).toBeDefined();
    expect(followUpToolMessage?.content).toBe(
      JSON.stringify([{ id: 'spec-1', name: 'Cardiología', specialtyCode: 1 }]),
    );
  });

  it('devuelve fallback controlado y evita llamar OpenAI si el budget no entra', async () => {
    conversationService.preflightContextBudget.mockRejectedValue(
      new ContextBudgetExceededError(),
    );

    const result = await service.processMessageFromDoctor(
      '+584241234567',
      'Traé todo el historial',
    );

    expect(result).toContain('no entra de forma segura');
    expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
  });
});
