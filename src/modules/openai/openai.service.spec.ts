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
  },
}));

import { OpenaiService } from './openai.service';
import { NotFoundException } from '@nestjs/common';

describe('OpenaiService', () => {
  let service: OpenaiService;
  let mockPrisma: {
    user: { create: jest.Mock; findFirst: jest.Mock };
    patient: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
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
  };
  let mockConversationService: {
    findDoctorByPhone: jest.Mock;
    getOrCreateActiveConversation: jest.Mock;
    addMessage: jest.Mock;
  };
  let mockAppointmentService: { findTodaysByDoctor: jest.Mock };

  const mockConversation = {
    id: 'conversation-uuid',
    doctorId: 'doctor-uuid',
    model: 'gpt-4',
    systemPrompt: 'Test prompt',
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      patient: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
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
      findDoctorByPhone: jest.fn(),
      getOrCreateActiveConversation: jest.fn(),
      addMessage: jest.fn(),
    };
    mockAppointmentService = {
      findTodaysByDoctor: jest.fn().mockResolvedValue([]),
    };

    service = new OpenaiService(
      mockPrisma as never,
      mockConversationService as never,
      mockAppointmentService as never,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processMessageFromDoctor', () => {
    it('debe procesar mensaje y retornar respuesta de OpenAI', async () => {
      mockConversationService.findDoctorByPhone.mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      });
      mockConversationService.getOrCreateActiveConversation.mockResolvedValue({
        conversation: mockConversation,
        messages: [],
      });
      mockConversationService.addMessage.mockResolvedValue({ id: 'msg-1' });

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content:
                '¡Hola! Soy tu asistente médico. ¿En qué puedo ayudarte?',
              tool_calls: null,
            },
          },
        ],
      });

      const result = await service.processMessageFromDoctor(
        '+584241234567',
        'Hola',
      );

      expect(result).toBe(
        '¡Hola! Soy tu asistente médico. ¿En qué puedo ayudarte?',
      );
      expect(mockConversationService.findDoctorByPhone).toHaveBeenCalledWith(
        '+584241234567',
      );
      expect(mockConversationService.addMessage).toHaveBeenCalledTimes(2);
    });

    it('debe lanzar NotFoundException si no encuentra doctor', async () => {
      mockConversationService.findDoctorByPhone.mockResolvedValue(null);

      await expect(
        service.processMessageFromDoctor('+584241234567', 'Hola'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe usar contexto de mensajes previos', async () => {
      const previousMessages = [
        { role: 'user', content: 'Registra un paciente' },
        { role: 'assistant', content: '¿Cuál es el nombre del paciente?' },
      ];

      mockConversationService.findDoctorByPhone.mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      });
      mockConversationService.getOrCreateActiveConversation.mockResolvedValue({
        conversation: mockConversation,
        messages: previousMessages,
      });
      mockConversationService.addMessage.mockResolvedValue({ id: 'msg-1' });

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '¿Cuál es el apellido del paciente?',
              tool_calls: null,
            },
          },
        ],
      });

      await service.processMessageFromDoctor('+584241234567', 'Juan');

      const createCalls = mockChatCompletionsCreate.mock.calls as Array<
        [unknown]
      >;
      const createArg = createCalls[0]?.[0] as
        | { messages?: unknown }
        | undefined;
      expect(createArg).toBeDefined();
      expect(Array.isArray(createArg?.messages)).toBe(true);
      const messages = (
        createArg?.messages as Array<{ role?: unknown; content?: unknown }>
      ).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      expect(messages.some((m) => m.role === 'system')).toBe(true);
      expect(
        messages.some(
          (m) => m.role === 'user' && m.content === 'Registra un paciente',
        ),
      ).toBe(true);
      expect(
        messages.some(
          (m) =>
            m.role === 'assistant' &&
            m.content === '¿Cuál es el nombre del paciente?',
        ),
      ).toBe(true);
      expect(
        messages.some((m) => m.role === 'user' && m.content === 'Juan'),
      ).toBe(true);
    });
  });

  describe('Tool calls', () => {
    beforeEach(() => {
      mockConversationService.findDoctorByPhone.mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      });
      mockConversationService.getOrCreateActiveConversation.mockResolvedValue({
        conversation: mockConversation,
        messages: [],
      });
      mockConversationService.addMessage.mockResolvedValue({ id: 'msg-1' });
    });

    it('debe ejecutar tool call get_all_patients', async () => {
      const mockPatients = [
        { id: 'p1', user: { name: 'Juan', lastName: 'Pérez' } },
        { id: 'p2', user: { name: 'María', lastName: 'García' } },
      ];

      mockPrisma.patient.findMany.mockResolvedValue(mockPatients);

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
                      name: 'get_all_patients',
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
                content:
                  'Encontré 2 pacientes registrados: Juan Pérez y María García.',
              },
            },
          ],
        });

      const result = await service.processMessageFromDoctor(
        '+584241234567',
        'Muéstrame todos los pacientes',
      );

      expect(mockPrisma.patient.findMany).toHaveBeenCalled();
      expect(result).toContain('2 pacientes');
    });

    it('debe ejecutar tool call register_patient', async () => {
      const mockCreatedUser = {
        id: 'user-uuid',
        email: 'nuevo@test.com',
        name: 'Carlos',
        lastName: 'López',
        phone: '+584247654321',
        patient: { id: 'patient-uuid' },
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

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
                      name: 'register_patient',
                      arguments: JSON.stringify({
                        email: 'nuevo@test.com',
                        name: 'Carlos',
                        lastName: 'López',
                        phone: '+584247654321',
                      }),
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
                content: 'Paciente Carlos López registrado exitosamente.',
              },
            },
          ],
        });

      const result = await service.processMessageFromDoctor(
        '+584241234567',
        'Registra paciente Carlos López, email nuevo@test.com, teléfono +584247654321',
      );

      const userCreateCalls = mockPrisma.user.create.mock.calls as Array<
        [unknown]
      >;
      const createArg = userCreateCalls[0]?.[0] as
        | {
          data?: {
            email?: unknown;
            name?: unknown;
            lastName?: unknown;
            phone?: unknown;
          };
        }
        | undefined;
      expect(createArg?.data?.email).toBe('nuevo@test.com');
      expect(createArg?.data?.name).toBe('Carlos');
      expect(createArg?.data?.lastName).toBe('López');
      expect(createArg?.data?.phone).toBe('+584247654321');
      expect(result).toContain('Carlos López');
    });

    it('debe ejecutar tool call get_patient', async () => {
      const mockPatient = {
        id: 'patient-uuid',
        user: {
          name: 'Juan',
          lastName: 'Pérez',
          email: 'juan@test.com',
          phone: '+584241234567',
        },
        allergies: ['Penicilina'],
        medications: [],
      };

      mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);
      mockPrisma.appointment.findFirst.mockResolvedValue({
        id: 'apt-1',
        doctorId: 'doctor-uuid',
        patientId: 'patient-uuid',
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
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content:
                  'Paciente Juan Pérez encontrado. Tiene alergia a Penicilina.',
              },
            },
          ],
        });

      const result = await service.processMessageFromDoctor(
        '+584241234567',
        'Busca al paciente patient-uuid',
      );

      const patientFindUniqueCalls = mockPrisma.patient.findUnique.mock
        .calls as Array<[unknown]>;
      const findUniqueArg = patientFindUniqueCalls[0]?.[0] as
        | { where?: { id?: unknown }; include?: unknown }
        | undefined;
      expect(findUniqueArg?.where?.id).toBe('patient-uuid');
      expect(typeof findUniqueArg?.include).toBe('object');
      expect(result).toContain('Juan Pérez');
    });

    it('debe ejecutar tool call cancel_appointment', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: 'appointment-uuid',
        doctorId: 'doctor-uuid',
        status: 'pending',
      });
      mockPrisma.appointment.update.mockResolvedValue({
        id: 'appointment-uuid',
        status: 'cancelled',
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
                    function: {
                      name: 'cancel_appointment',
                      arguments: JSON.stringify({
                        appointmentId: 'appointment-uuid',
                      }),
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
                content: 'Cita cancelada exitosamente.',
              },
            },
          ],
        });

      const result = await service.processMessageFromDoctor(
        '+584241234567',
        'Cancela la cita appointment-uuid',
      );

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-uuid' },
        data: { status: 'cancelled' },
      });
      expect(result).toContain('cancelada');
    });
  });

  describe('getSystemPrompt', () => {
    it('debe retornar el prompt del sistema', () => {
      const prompt = service.getSystemPrompt();

      expect(prompt).toContain('asistente del médico');
      expect(prompt).toContain('FUNCIONES DISPONIBLES');
      expect(prompt).toContain('REGLAS ESTRICTAS');
    });
  });
});
