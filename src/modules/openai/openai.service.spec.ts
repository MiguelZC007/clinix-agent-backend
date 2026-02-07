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
import { NotFoundException, ConflictException } from '@nestjs/common';

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
  };
  let mockConversationService: {
    findDoctorByPhone: jest.Mock;
    getOrCreateActiveConversation: jest.Mock;
    getContextForConversation: jest.Mock;
    addMessage: jest.Mock;
  };
  let mockAppointmentService: { findTodaysByDoctor: jest.Mock };
  let mockClinicHistoryService: {
    create: jest.Mock;
    createWithoutAppointment: jest.Mock;
  };

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
      findDoctorByPhone: jest.fn(),
      getOrCreateActiveConversation: jest.fn(),
      getContextForConversation: jest.fn(),
      addMessage: jest.fn(),
    };
    mockAppointmentService = {
      findTodaysByDoctor: jest.fn().mockResolvedValue([]),
    };
    mockClinicHistoryService = {
      create: jest.fn(),
      createWithoutAppointment: jest.fn(),
    };

    service = new OpenaiService(
      mockPrisma as never,
      mockConversationService as never,
      mockAppointmentService as never,
      mockClinicHistoryService as never,
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

  describe('processMessageInConversation', () => {
    it('obtiene contexto, llama a OpenAI y persiste respuesta del asistente', async () => {
      const contextMessages = [
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: '¿En qué puedo ayudarte?' },
      ];
      mockConversationService.getContextForConversation.mockResolvedValue(
        contextMessages,
      );
      mockConversationService.addMessage.mockResolvedValue({ id: 'msg-1' });

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Puedo ayudarte con pacientes, citas e historias clínicas.',
              tool_calls: null,
            },
          },
        ],
      });

      const result = await service.processMessageInConversation(
        'doctor-uuid',
        'conversation-uuid',
      );

      expect(result).toBe(
        'Puedo ayudarte con pacientes, citas e historias clínicas.',
      );
      expect(
        mockConversationService.getContextForConversation,
      ).toHaveBeenCalledWith('conversation-uuid', 'doctor-uuid');
      expect(mockConversationService.addMessage).toHaveBeenCalledTimes(1);
      expect(mockConversationService.addMessage).toHaveBeenCalledWith(
        'conversation-uuid',
        'assistant',
        'Puedo ayudarte con pacientes, citas e historias clínicas.',
      );
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

    it('debe ejecutar tool call get_all_patients con query y devolver coincidencias', async () => {
      const mockPatients = [
        {
          id: 'p1',
          user: { name: 'Juan', lastName: 'Pérez', email: 'j@t.com', phone: '+58' },
        },
        {
          id: 'p2',
          user: { name: 'María', lastName: 'García', email: 'm@t.com', phone: '+58' },
        },
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
                      arguments: JSON.stringify({ query: 'Juan' }),
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
        'Busca pacientes que se llamen Juan',
      );

      expect(mockPrisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          take: 200,
          orderBy: expect.any(Array),
          include: expect.any(Object),
        }),
      );
      expect(result).toContain('2 pacientes');
    });

    it('get_all_patients sin query devuelve lista vacía y no llama a findMany', async () => {
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
                content: 'No hay criterio de búsqueda; indique nombre o apellido.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Dame todos los pacientes',
      );

      expect(mockPrisma.patient.findMany).not.toHaveBeenCalled();
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
      const patientCreate = (createArg?.data as { patient?: { create?: { registeredByDoctorId?: string } } })?.patient?.create;
      expect(patientCreate?.registeredByDoctorId).toBe('doctor-uuid');
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

    it('debe ejecutar tool call list_specialties', async () => {
      mockConversationService.findDoctorByPhone.mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      });
      mockConversationService.getOrCreateActiveConversation.mockResolvedValue({
        conversation: mockConversation,
        messages: [],
      });
      mockConversationService.addMessage.mockResolvedValue({ id: 'msg-1' });

      const mockSpecialties = [
        { id: 'spec-1', name: 'Cardiología' },
        { id: 'spec-2', name: 'Pediatría' },
      ];
      mockPrisma.specialty.findMany.mockResolvedValue(mockSpecialties);

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
                      arguments: JSON.stringify({}),
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
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        '¿Cuáles son las especialidades?',
      );

      expect(mockPrisma.specialty.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, specialtyCode: true },
        orderBy: { name: 'asc' },
      });
    });

    it('debe ejecutar tool call search_patients con query opcional', async () => {
      mockConversationService.findDoctorByPhone.mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      });
      mockConversationService.getOrCreateActiveConversation.mockResolvedValue({
        conversation: mockConversation,
        messages: [],
      });
      mockConversationService.addMessage.mockResolvedValue({ id: 'msg-1' });

      const mockPatients = [
        {
          id: 'patient-1',
          user: { name: 'Juan', lastName: 'Pérez' },
        },
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
                      name: 'search_patients',
                      arguments: JSON.stringify({ query: 'Juan' }),
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
                content: 'Encontré al paciente Juan Pérez.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Busca pacientes que se llamen Juan',
      );

      expect(mockPrisma.patient.findMany).toHaveBeenCalled();
      const findManyCall = mockPrisma.patient.findMany.mock
        .calls[0] as Array<unknown>;
      const whereArg = (findManyCall[0] as { where?: { OR?: unknown[] } })?.where;
      expect(whereArg).toBeDefined();
      expect(whereArg?.OR).toBeDefined();
      expect(Array.isArray(whereArg?.OR)).toBe(true);
      expect((whereArg?.OR ?? []).length).toBeGreaterThanOrEqual(2);
      const hasAppointments = (whereArg?.OR ?? []).some(
        (o) => o && typeof o === 'object' && 'appointments' in o,
      );
      const hasRegisteredBy = (whereArg?.OR ?? []).some(
        (o) => o && typeof o === 'object' && 'registeredByDoctorId' in o,
      );
      expect(hasAppointments).toBe(true);
      expect(hasRegisteredBy).toBe(true);
    });

    it('create_appointment con paciente inexistente no llama a appointment.create y devuelve error al LLM', async () => {
      mockConversationService.findDoctorByPhone.mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      });
      mockConversationService.getOrCreateActiveConversation.mockResolvedValue({
        conversation: mockConversation,
        messages: [],
      });
      mockConversationService.addMessage.mockResolvedValue({ id: 'msg-1' });

      const nonexistentPatientUuid = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
      const anySpecialtyUuid = 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff';
      mockPrisma.patient.findUnique.mockResolvedValue(null);

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
                      name: 'create_appointment',
                      arguments: JSON.stringify({
                        patientId: nonexistentPatientUuid,
                        specialtyId: anySpecialtyUuid,
                        startAppointment: '2026-02-02T15:00:00',
                        endAppointment: '2026-02-02T15:15:00',
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
                content:
                  'No pude crear la cita: el paciente no fue encontrado. Verifique que seleccionó un paciente de la lista.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Crea una cita para un paciente inexistente',
      );

      expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(2);
      const secondCall = mockChatCompletionsCreate.mock.calls[1];
      const messages = secondCall?.[0]?.messages as Array<{ role?: string; content?: string }>;
      const toolMessage = messages?.find((m) => m.role === 'tool');
      const content = toolMessage?.content ?? '';
      expect(content).toContain('"success":false');
      expect(content).toContain('"error":');
    });

    it('create_appointment con especialidad inexistente no llama a appointment.create', async () => {
      mockConversationService.findDoctorByPhone.mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      });
      mockConversationService.getOrCreateActiveConversation.mockResolvedValue({
        conversation: mockConversation,
        messages: [],
      });
      mockConversationService.addMessage.mockResolvedValue({ id: 'msg-1' });

      const nonexistentSpecialtyUuid = 'cccccccc-dddd-4eee-ffff-000000000000';
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'patient-uuid',
        userId: 'user-uuid',
        registeredByDoctorId: 'doctor-uuid',
      });
      mockPrisma.specialty.findUnique.mockResolvedValue(null);

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
                      name: 'create_appointment',
                      arguments: JSON.stringify({
                        patientId: 'patient-uuid',
                        specialtyId: nonexistentSpecialtyUuid,
                        startAppointment: '2026-02-02T15:00:00',
                        endAppointment: '2026-02-02T15:15:00',
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
                content:
                  'No pude crear la cita: la especialidad no fue encontrada.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Crea una cita en especialidad inexistente',
      );

      expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
      const secondCall = mockChatCompletionsCreate.mock.calls[1];
      const messages = secondCall?.[0]?.messages as Array<{ role?: string; content?: string }>;
      const toolMessage = messages?.find((m) => m.role === 'tool');
      const content = toolMessage?.content ?? '';
      expect(content).toContain('"success":false');
      expect(content).toContain('"error":');
    });

    it.skip('create_appointment con paciente registrado por el mismo doctor crea la cita sin tener citas previas', async () => {
      const validPatientUuid = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
      const validSpecialtyUuid = 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff';
      mockConversationService.findDoctorByPhone.mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      });
      mockConversationService.getOrCreateActiveConversation.mockResolvedValue({
        conversation: mockConversation,
        messages: [],
      });
      mockConversationService.addMessage.mockResolvedValue({ id: 'msg-1' });

      mockPrisma.patient.findUnique.mockResolvedValue({
        id: validPatientUuid,
        registeredByDoctorId: 'doctor-uuid',
      });
      mockPrisma.specialty.findUnique.mockResolvedValue({
        id: validSpecialtyUuid,
        name: 'Cardiología',
      });
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.create.mockResolvedValue({
        id: 'appointment-uuid',
        patientId: validPatientUuid,
        doctorId: 'doctor-uuid',
        specialtyId: validSpecialtyUuid,
        startAppointment: new Date('2026-02-02T15:00:00'),
        endAppointment: new Date('2026-02-02T15:15:00'),
        status: 'pending',
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
                      name: 'create_appointment',
                      arguments: JSON.stringify({
                        patientId: validPatientUuid,
                        specialtyId: validSpecialtyUuid,
                        startAppointment: '2026-02-02T15:00:00',
                        endAppointment: '2026-02-02T15:15:00',
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
                content: 'Cita creada correctamente para el paciente.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Crea una cita para el paciente en Cardiología',
      );

      expect(mockPrisma.appointment.create).toHaveBeenCalled();
      expect(mockPrisma.appointment.findFirst).not.toHaveBeenCalled();
    });

    it('create_appointment con nombre de paciente y especialidad resuelve a UUID y crea la cita', async () => {
      mockConversationService.findDoctorByPhone.mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      });
      mockConversationService.getOrCreateActiveConversation.mockResolvedValue({
        conversation: mockConversation,
        messages: [],
      });
      mockConversationService.addMessage.mockResolvedValue({ id: 'msg-1' });

      mockPrisma.patient.findMany.mockResolvedValueOnce([
        {
          id: 'patient-uuid',
          user: { name: 'Pedro', lastName: 'Gonzales' },
        },
      ]);
      mockPrisma.specialty.findMany.mockResolvedValueOnce([
        { id: 'spec-uuid' },
      ]);
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 'patient-uuid',
        registeredByDoctorId: 'doctor-uuid',
      });
      mockPrisma.specialty.findUnique.mockResolvedValue({
        id: 'spec-uuid',
        name: 'Cardiología',
      });
      mockPrisma.appointment.create.mockResolvedValue({
        id: 'appointment-uuid',
        patientId: 'patient-uuid',
        doctorId: 'doctor-uuid',
        specialtyId: 'spec-uuid',
        startAppointment: new Date('2026-02-06T08:00:00'),
        endAppointment: new Date('2026-02-06T08:15:00'),
        status: 'pending',
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
                      name: 'create_appointment',
                      arguments: JSON.stringify({
                        patientId: 'Pedro Gonzales',
                        specialtyId: 'Cardiología',
                        startAppointment: '2026-02-06T08:00:00',
                        endAppointment: '2026-02-06T08:15:00',
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
                content: 'Cita creada correctamente.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Crea cita para Pedro Gonzales en Cardiología',
      );

      expect(mockPrisma.patient.findMany).toHaveBeenCalled();
      expect(mockPrisma.specialty.findMany).toHaveBeenCalled();
      expect(mockPrisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: 'patient-uuid',
            specialtyId: 'spec-uuid',
            doctorId: 'doctor-uuid',
          }),
        }),
      );
    });

    it('create_appointment con nombre de paciente sin coincidencias no crea cita y devuelve error', async () => {
      mockConversationService.findDoctorByPhone.mockResolvedValue({
        doctorId: 'doctor-uuid',
        doctorName: 'Dr. Test',
      });
      mockConversationService.getOrCreateActiveConversation.mockResolvedValue({
        conversation: mockConversation,
        messages: [],
      });
      mockConversationService.addMessage.mockResolvedValue({ id: 'msg-1' });

      mockPrisma.patient.findMany.mockResolvedValue([]);
      mockPrisma.specialty.findMany.mockResolvedValue([{ id: 'spec-uuid' }]);

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
                      name: 'create_appointment',
                      arguments: JSON.stringify({
                        patientId: 'Paciente Inexistente',
                        specialtyId: 'Cardiología',
                        startAppointment: '2026-02-06T08:00:00',
                        endAppointment: '2026-02-06T08:15:00',
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
                content: 'No pude crear la cita.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Crea cita para Paciente Inexistente',
      );

      expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
      const secondCall = mockChatCompletionsCreate.mock.calls[1];
      const messages = secondCall?.[0]?.messages as Array<{ role?: string; content?: string }>;
      const toolMessage = messages?.find((m) => m.role === 'tool');
      const content = toolMessage?.content ?? '';
      expect(content).toContain('appointment-use-id-not-name');
    });
  });

  describe('create_clinic_history', () => {
    const validCreateClinicHistoryArgs = {
      appointmentId: '550e8400-e29b-41d4-a716-446655440000',
      consultationReason: 'Dolor de cabeza persistente desde hace 3 días',
      symptoms: ['cefalea', 'mareos'],
      treatment: 'Reposo, hidratación y paracetamol 500mg cada 8 horas.',
      diagnostics: [
        { name: 'Cefalea tensional', description: 'Cefalea de características tensionales' },
      ],
      physicalExams: [
        { name: 'Examen neurológico', description: 'Sin focalidad' },
      ],
      vitalSigns: [
        {
          name: 'Presión arterial',
          value: '120/80',
          unit: 'mmHg',
          measurement: 'brazo derecho',
        },
      ],
    };

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

    it('crea historia clínica con todos los campos y llama a ClinicHistoryService', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: validCreateClinicHistoryArgs.appointmentId,
        patientId: 'patient-uuid',
        doctorId: 'doctor-uuid',
        specialtyId: 'specialty-uuid',
      });
      mockClinicHistoryService.create.mockResolvedValue({
        id: 'history-uuid',
        appointmentId: validCreateClinicHistoryArgs.appointmentId,
        consultationReason: validCreateClinicHistoryArgs.consultationReason,
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
                      name: 'create_clinic_history',
                      arguments: JSON.stringify(validCreateClinicHistoryArgs),
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
                content: 'Historia clínica registrada correctamente.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Registra la historia clínica de la cita',
      );

      expect(mockPrisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: validCreateClinicHistoryArgs.appointmentId },
      });
      expect(mockClinicHistoryService.create).toHaveBeenCalledTimes(1);
      const createArg = mockClinicHistoryService.create.mock.calls[0][0];
      expect(createArg.appointmentId).toBe(validCreateClinicHistoryArgs.appointmentId);
      expect(createArg.consultationReason).toBe(
        validCreateClinicHistoryArgs.consultationReason,
      );
      expect(createArg.symptoms).toEqual(validCreateClinicHistoryArgs.symptoms);
      expect(createArg.diagnostics).toHaveLength(1);
      expect(createArg.physicalExams).toHaveLength(1);
      expect(createArg.vitalSigns).toHaveLength(1);
    });

    it('lanza NotFoundException cuando la cita no existe', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

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
                      name: 'create_clinic_history',
                      arguments: JSON.stringify({
                        ...validCreateClinicHistoryArgs,
                        appointmentId: '00000000-0000-0000-0000-000000000000',
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
                content: 'La cita no fue encontrada.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Registra historia para cita inexistente',
      );

      expect(mockClinicHistoryService.create).not.toHaveBeenCalled();
      const secondCall = mockChatCompletionsCreate.mock.calls[1];
      const messages = (secondCall?.[0] as { messages?: Array<{ role?: string; content?: string }> })
        ?.messages ?? [];
      const toolMessage = messages.find((m) => m.role === 'tool');
      const content = toolMessage?.content ?? '';
      const parsed = JSON.parse(content) as { success?: boolean; error?: string };
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('appointment-not-found');
    });

    it('lanza ForbiddenException cuando la cita es de otro doctor', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: validCreateClinicHistoryArgs.appointmentId,
        patientId: 'patient-uuid',
        doctorId: 'other-doctor-uuid',
        specialtyId: 'specialty-uuid',
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
                      name: 'create_clinic_history',
                      arguments: JSON.stringify(validCreateClinicHistoryArgs),
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
                content: 'No tiene acceso a esa cita.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Registra historia para cita de otro doctor',
      );

      expect(mockClinicHistoryService.create).not.toHaveBeenCalled();
      const secondCall = mockChatCompletionsCreate.mock.calls[1];
      const messages = (secondCall?.[0] as { messages?: Array<{ role?: string; content?: string }> })
        ?.messages ?? [];
      const toolMessage = messages.find((m) => m.role === 'tool');
      const content = toolMessage?.content ?? '';
      const parsed = JSON.parse(content) as { success?: boolean; error?: string };
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('appointment-not-owned-by-doctor');
    });

    it('propaga ConflictException cuando la cita ya tiene historia clínica', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: validCreateClinicHistoryArgs.appointmentId,
        patientId: 'patient-uuid',
        doctorId: 'doctor-uuid',
        specialtyId: 'specialty-uuid',
      });
      mockClinicHistoryService.create.mockRejectedValue(
        new ConflictException('appointment-already-has-clinic-history'),
      );

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
                      name: 'create_clinic_history',
                      arguments: JSON.stringify(validCreateClinicHistoryArgs),
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
                content: 'Esta cita ya tiene una historia clínica registrada.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Registra historia para cita que ya tiene historia',
      );

      expect(mockClinicHistoryService.create).toHaveBeenCalledTimes(1);
      const secondCall = mockChatCompletionsCreate.mock.calls[1];
      const messages = (secondCall?.[0] as { messages?: Array<{ role?: string; content?: string }> })
        ?.messages ?? [];
      const toolMessage = messages.find((m) => m.role === 'tool');
      const content = toolMessage?.content ?? '';
      const parsed = JSON.parse(content) as { success?: boolean; error?: string };
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('appointment-already-has-clinic-history');
    });

    it('crea historia clínica sin cita cuando se envían patientId y specialtyId', async () => {
      const argsWithoutAppointment = {
        patientId: '550e8400-e29b-41d4-a716-446655440001',
        specialtyId: '550e8400-e29b-41d4-a716-446655440002',
        consultationReason:
          'Dolor de cabeza persistente desde hace 3 días',
        symptoms: ['cefalea', 'mareos'],
        treatment: 'Reposo, hidratación y paracetamol 500mg cada 8 horas.',
        diagnostics: [
          {
            name: 'Cefalea tensional',
            description: 'Cefalea de características tensionales',
          },
        ],
        physicalExams: [
          { name: 'Examen neurológico', description: 'Sin focalidad' },
        ],
        vitalSigns: [
          {
            name: 'Presión arterial',
            value: '120/80',
            unit: 'mmHg',
            measurement: 'brazo derecho',
          },
        ],
      };
      mockClinicHistoryService.createWithoutAppointment.mockResolvedValue({
        id: 'history-uuid',
        consultationReason: argsWithoutAppointment.consultationReason,
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
                      name: 'create_clinic_history',
                      arguments: JSON.stringify(argsWithoutAppointment),
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
                content: 'Historia clínica registrada correctamente.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Registra historia clínica para el paciente sin cita',
      );

      expect(mockPrisma.appointment.findUnique).not.toHaveBeenCalled();
      expect(mockClinicHistoryService.create).not.toHaveBeenCalled();
      expect(
        mockClinicHistoryService.createWithoutAppointment,
      ).toHaveBeenCalledTimes(1);
      const [doctorId, dto] =
        mockClinicHistoryService.createWithoutAppointment.mock.calls[0];
      expect(doctorId).toBe('doctor-uuid');
      expect(dto.patientId).toBe(argsWithoutAppointment.patientId);
      expect(dto.specialtyId).toBe(argsWithoutAppointment.specialtyId);
      expect(dto.consultationReason).toBe(argsWithoutAppointment.consultationReason);
      expect(dto.symptoms).toEqual(argsWithoutAppointment.symptoms);
    });

    it('crea historia clínica sin cita cuando se envían patientNumber y specialtyCode', async () => {
      const argsWithNumbers = {
        patientNumber: 1,
        specialtyCode: 2,
        consultationReason:
          'Dolor de cabeza persistente desde hace 3 días',
        symptoms: ['cefalea', 'mareos'],
        treatment: 'Reposo, hidratación y paracetamol.',
        diagnostics: [
          {
            name: 'Cefalea tensional',
            description: 'Cefalea de características tensionales',
          },
        ],
        physicalExams: [
          { name: 'Examen neurológico', description: 'Sin focalidad' },
        ],
        vitalSigns: [
          {
            name: 'Presión arterial',
            value: '120/80',
            unit: 'mmHg',
            measurement: 'brazo derecho',
          },
        ],
      };
      const resolvedPatientId = '550e8400-e29b-41d4-a716-446655440001';
      const resolvedSpecialtyId = '550e8400-e29b-41d4-a716-446655440002';
      mockPrisma.patient.findUnique.mockImplementation((args: { where?: { patientNumber?: number } }) => {
        if (args?.where?.patientNumber === 1) {
          return Promise.resolve({ id: resolvedPatientId });
        }
        return Promise.resolve(null);
      });
      mockPrisma.specialty.findUnique.mockImplementation((args: { where?: { specialtyCode?: number } }) => {
        if (args?.where?.specialtyCode === 2) {
          return Promise.resolve({ id: resolvedSpecialtyId });
        }
        return Promise.resolve(null);
      });
      mockClinicHistoryService.createWithoutAppointment.mockResolvedValue({
        id: 'history-uuid',
        consultationReason: argsWithNumbers.consultationReason,
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
                      name: 'create_clinic_history',
                      arguments: JSON.stringify(argsWithNumbers),
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
                content: 'Historia clínica registrada correctamente.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Registra historia clínica para paciente 1 especialidad 2',
      );

      expect(mockPrisma.patient.findUnique).toHaveBeenCalledWith({
        where: { patientNumber: 1 },
      });
      expect(mockPrisma.specialty.findUnique).toHaveBeenCalledWith({
        where: { specialtyCode: 2 },
      });
      expect(
        mockClinicHistoryService.createWithoutAppointment,
      ).toHaveBeenCalledTimes(1);
      const [, dto] =
        mockClinicHistoryService.createWithoutAppointment.mock.calls[0];
      expect(dto.patientNumber).toBe(1);
      expect(dto.specialtyCode).toBe(2);
      expect(dto.consultationReason).toBe(argsWithNumbers.consultationReason);
    });

    it('lanza NotFoundException cuando patientNumber no existe en create_clinic_history sin cita', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);
      const argsWithNumbers = {
        patientNumber: 999,
        specialtyCode: 1,
        consultationReason: 'Motivo',
        symptoms: ['síntoma'],
        treatment: 'Tratamiento',
        diagnostics: [{ name: 'D', description: 'Desc' }],
        physicalExams: [{ name: 'E', description: 'E desc' }],
        vitalSigns: [
          {
            name: 'PA',
            value: '120',
            unit: 'mmHg',
            measurement: 'M',
          },
        ],
      };
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
                      name: 'create_clinic_history',
                      arguments: JSON.stringify(argsWithNumbers),
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
                content: 'Paciente no encontrado.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Registra historia para paciente 999',
      );

      expect(mockClinicHistoryService.createWithoutAppointment).not.toHaveBeenCalled();
      const secondCall = mockChatCompletionsCreate.mock.calls[1];
      const messages =
        (secondCall?.[0] as { messages?: Array<{ role?: string; content?: string }> })
          ?.messages ?? [];
      const toolMessage = messages.find((m) => m.role === 'tool');
      const content = toolMessage?.content ?? '';
      const parsed = JSON.parse(content) as { success?: boolean; error?: string };
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('patient-not-found');
    });

    it('lanza BadRequest cuando no hay appointmentId y faltan patientId o specialtyId', async () => {
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
                      name: 'create_clinic_history',
                      arguments: JSON.stringify({
                        consultationReason:
                          'Dolor de cabeza persistente desde hace 3 días',
                        symptoms: ['cefalea'],
                        treatment: 'Reposo e hidratación.',
                        diagnostics: [
                          {
                            name: 'Cefalea',
                            description: 'Cefalea tensional',
                          },
                        ],
                        physicalExams: [
                          {
                            name: 'Examen neurológico',
                            description: 'Normal',
                          },
                        ],
                        vitalSigns: [
                          {
                            name: 'PA',
                            value: '120/80',
                            unit: 'mmHg',
                            measurement: 'brazo',
                          },
                        ],
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
                content: 'Se requieren patientId y specialtyId cuando no hay cita.',
              },
            },
          ],
        });

      await service.processMessageFromDoctor(
        '+584241234567',
        'Crea historia sin cita',
      );

      expect(mockClinicHistoryService.create).not.toHaveBeenCalled();
      expect(
        mockClinicHistoryService.createWithoutAppointment,
      ).not.toHaveBeenCalled();
      const secondCall = mockChatCompletionsCreate.mock.calls[1];
      const messages =
        (secondCall?.[0] as { messages?: Array<{ role?: string; content?: string }> })
          ?.messages ?? [];
      const toolMessage = messages.find((m) => m.role === 'tool');
      const content = toolMessage?.content ?? '';
      const parsed = JSON.parse(content) as {
        success?: boolean;
        error?: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe(
        'validation-error-patient-and-specialty-required-without-appointment',
      );
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
