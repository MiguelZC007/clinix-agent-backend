import { OpenaiService } from './openai.service';

describe('OpenaiService - Multi-round Tool Calling', () => {
  let service: OpenaiService;
  let mockPrisma: any;
  let mockConversationService: any;
  let mockAppointmentService: any;
  let mockClinicHistoryService: any;
  let mockChatCompletionsCreate: jest.Mock;

  const mockConversation = {
    id: 'conversation-uuid',
    doctorId: 'doctor-uuid',
    model: 'gpt-4',
    systemPrompt: 'Test prompt',
  };

  beforeEach(() => {
    mockChatCompletionsCreate = jest.fn();

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
      },
    }));

    mockPrisma = {
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

    mockConversationService = {
      findDoctorByPhone: jest.fn().mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      }),
      getOrCreateActiveConversation: jest.fn().mockResolvedValue({
        conversation: mockConversation,
        messages: [],
      }),
      getContextForConversation: jest.fn().mockResolvedValue([]),
      addMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
    };

    mockAppointmentService = {
      findTodaysByDoctor: jest.fn().mockResolvedValue([]),
    };

    mockClinicHistoryService = {
      create: jest.fn(),
      createWithoutAppointment: jest.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OpenaiService } = require('./openai.service');
    service = new OpenaiService(
      mockPrisma,
      mockConversationService,
      mockAppointmentService,
      mockClinicHistoryService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Single round tool call completion', () => {
    it('debe completar tool call en una sola ronda y retornar contenido final', async () => {
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
                    function: {
                      name: 'list_specialties',
                      arguments: '{}',
                    },
                  },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'Las especialidades son: Cardiología, Pediatría.',
                tool_calls: null,
              },
            },
          ],
        });

      mockPrisma.specialty.findMany.mockResolvedValue([
        { id: 'spec-1', name: 'Cardiología' },
        { id: 'spec-2', name: 'Pediatría' },
      ]);

      const result = await service.processMessageFromDoctor(
        '+584241234567',
        '¿Cuáles son las especialidades?',
      );

      expect(result).toBe('Las especialidades son: Cardiología, Pediatría.');
      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Two sequential tool_calls', () => {
    it('debe ejecutar tool_call_A en ronda 1 y tool_call_B en ronda 2', async () => {
      // Round 1: model returns tool_call_A
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
                    function: {
                      name: 'search_patients',
                      arguments: JSON.stringify({ query: 'Juan' }),
                    },
                  },
                ],
              },
            },
          ],
        })
        // Round 2: model returns tool_call_B after receiving tool result
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: 'call-2',
                    type: 'function',
                    function: {
                      name: 'get_patient',
                      arguments: JSON.stringify({ patientId: 'patient-uuid' }),
                    },
                  },
                ],
              },
            },
          ],
        })
        // Round 3: model returns final content (no more tool_calls)
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'Encontré al paciente Juan Pérez.',
                tool_calls: null,
              },
            },
          ],
        });

      mockPrisma.patient.findMany.mockResolvedValue([
        { id: 'patient-uuid', user: { name: 'Juan', lastName: 'Pérez' } },
      ]);
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'patient-uuid',
        user: { name: 'Juan', lastName: 'Pérez' },
      });

      const result = await service.processMessageFromDoctor(
        '+584241234567',
        'Busca paciente Juan y obtén sus datos',
      );

      expect(result).toBe('Encontré al paciente Juan Pérez.');
      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Three rounds maximum', () => {
    it('debe ejecutar tres rondas de tool_calls y rechazar la cuarta', async () => {
      // Create a chain of 3 tool_calls
      // Round 1
      mockChatCompletionsCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  function: {
                    name: 'search_patients',
                    arguments: JSON.stringify({ query: 'Juan' }),
                  },
                },
              ],
            },
          },
        ],
      });

      // Round 2
      mockChatCompletionsCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call-2',
                  type: 'function',
                  function: {
                    name: 'get_patient',
                    arguments: JSON.stringify({ patientId: 'patient-1' }),
                  },
                },
              ],
            },
          },
        ],
      });

      // Round 3
      mockChatCompletionsCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call-3',
                  type: 'function',
                  function: {
                    name: 'get_patient_antecedents',
                    arguments: JSON.stringify({ patientId: 'patient-1' }),
                  },
                },
              ],
            },
          },
        ],
      });

      // After 3 rounds, the model should NOT be called again with tool_calls
      // It should return final content
      mockChatCompletionsCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'El paciente tiene antecedentes de diabetes.',
              tool_calls: null,
            },
          },
        ],
      });

      mockPrisma.patient.findMany.mockResolvedValue([
        { id: 'patient-1', user: { name: 'Juan', lastName: 'Pérez' } },
      ]);
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'patient-1',
        user: { name: 'Juan', lastName: 'Pérez' },
      });

      const result = await service.processMessageFromDoctor(
        '+584241234567',
        'Busca paciente Juan, obtén sus datos y antecedentes',
      );

      expect(result).toBe('El paciente tiene antecedentes de diabetes.');
      // Should be exactly 4 calls: 3 tool_call rounds + 1 final content
      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(4);
    });
  });
});
