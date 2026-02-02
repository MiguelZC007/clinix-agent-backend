import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import OpenAI from 'openai';
import { ConversationService } from './conversation.service';
import { AppointmentService } from '../appointment/appointment.service';
import type { AppointmentResponseDto } from '../appointment/dto/appointment-response.dto';
import environment from 'src/core/config/environments';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

type ChatCompletionTool = OpenAI.Chat.Completions.ChatCompletionTool;

const patientTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'register_patient',
      description: 'Register a new patient in the system',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Email address of the patient',
          },
          name: { type: 'string', description: 'First name of the patient' },
          lastName: { type: 'string', description: 'Last name of the patient' },
          phone: {
            type: 'string',
            description:
              'Phone number in international format (e.g., +584241234567)',
          },
          password: {
            type: 'string',
            description: 'Password for the patient account',
          },
          gender: {
            type: 'string',
            enum: ['male', 'female'],
            description: 'Gender of the patient',
          },
          birthDate: {
            type: 'string',
            description: 'Birth date in ISO 8601 format (e.g., 1990-05-15)',
          },
        },
        required: ['email', 'name', 'lastName', 'phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_all_patients',
      description: 'Retrieve a list of all registered patients',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_patient',
      description: 'Retrieve a specific patient by their ID',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'The unique identifier (UUID) of the patient',
          },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_patient',
      description: 'Update an existing patient information',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description:
              'The unique identifier (UUID) of the patient to update',
          },
          email: {
            type: 'string',
            description: 'New email address of the patient',
          },
          name: {
            type: 'string',
            description: 'New first name of the patient',
          },
          lastName: {
            type: 'string',
            description: 'New last name of the patient',
          },
          phone: {
            type: 'string',
            description: 'New phone number of the patient',
          },
          password: {
            type: 'string',
            description: 'New password for the patient account',
          },
          gender: {
            type: 'string',
            enum: ['male', 'female'],
            description: 'New gender of the patient',
          },
          birthDate: {
            type: 'string',
            description: 'New birth date in ISO 8601 format',
          },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_patient',
      description: 'Delete a patient from the system',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description:
              'The unique identifier (UUID) of the patient to delete',
          },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_antecedents',
      description:
        'Retrieve the medical antecedents of a patient (allergies, medications, medical history, family history)',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'The unique identifier (UUID) of the patient',
          },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_patient_antecedents',
      description: 'Update the medical antecedents of a patient',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'The unique identifier (UUID) of the patient',
          },
          allergies: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of patient allergies',
          },
          medications: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of current medications',
          },
          medicalHistory: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of past medical conditions',
          },
          familyHistory: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of family medical history',
          },
        },
        required: ['patientId'],
      },
    },
  },
];

const appointmentTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_appointment',
      description: 'Create a new medical appointment',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'The unique identifier (UUID) of the patient',
          },
          doctorId: {
            type: 'string',
            description: 'The unique identifier (UUID) of the doctor',
          },
          specialtyId: {
            type: 'string',
            description:
              'The unique identifier (UUID) of the medical specialty',
          },
          startAppointment: {
            type: 'string',
            description: 'Start date and time in ISO 8601 format',
          },
          endAppointment: {
            type: 'string',
            description: 'End date and time in ISO 8601 format',
          },
        },
        required: [
          'patientId',
          'doctorId',
          'specialtyId',
          'startAppointment',
          'endAppointment',
        ],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_all_appointments',
      description: 'Retrieve a list of all appointments',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_appointment',
      description: 'Retrieve a specific appointment by its ID',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: {
            type: 'string',
            description: 'The unique identifier (UUID) of the appointment',
          },
        },
        required: ['appointmentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_appointment',
      description: 'Update an existing appointment',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: {
            type: 'string',
            description: 'The unique identifier (UUID) of the appointment',
          },
          startAppointment: {
            type: 'string',
            description: 'New start date and time in ISO 8601 format',
          },
          endAppointment: {
            type: 'string',
            description: 'New end date and time in ISO 8601 format',
          },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'cancelled', 'completed'],
            description: 'New status',
          },
        },
        required: ['appointmentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description: 'Cancel an existing appointment',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: {
            type: 'string',
            description:
              'The unique identifier (UUID) of the appointment to cancel',
          },
        },
        required: ['appointmentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_appointments',
      description: 'Retrieve all appointments for a specific patient',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'The unique identifier (UUID) of the patient',
          },
        },
        required: ['patientId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTodaysAppointments',
      description:
        'Retrieve today\'s appointments for the authenticated doctor. Optional date in ISO 8601 format to query another day.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description:
              'Optional date in ISO 8601 format (e.g. 2026-02-01). Defaults to today.',
          },
        },
        required: [],
      },
    },
  },
];

const clinicHistoryTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_clinic_history',
      description: 'Create a new clinic history record for an appointment',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: {
            type: 'string',
            description:
              'The unique identifier (UUID) of the associated appointment',
          },
          consultationReason: {
            type: 'string',
            description: 'The reason for the medical consultation',
          },
          symptoms: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of symptoms reported by the patient',
          },
          treatment: {
            type: 'string',
            description: 'The prescribed treatment plan',
          },
          diagnostics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Name of the diagnosis' },
                description: {
                  type: 'string',
                  description: 'Detailed description of the diagnosis',
                },
              },
              required: ['name', 'description'],
            },
            description: 'List of diagnostics made during the consultation',
          },
          physicalExams: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the physical exam',
                },
                description: {
                  type: 'string',
                  description: 'Results or findings of the physical exam',
                },
              },
              required: ['name', 'description'],
            },
            description: 'List of physical examinations performed',
          },
          vitalSigns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Name of the vital sign' },
                value: {
                  type: 'string',
                  description: 'Measured value of the vital sign',
                },
                unit: { type: 'string', description: 'Unit of measurement' },
                measurement: {
                  type: 'string',
                  description: 'Method or location of measurement',
                },
                description: {
                  type: 'string',
                  description: 'Additional notes about the vital sign',
                },
              },
              required: ['name', 'value', 'unit', 'measurement'],
            },
            description: 'List of vital signs recorded',
          },
          prescription: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name or title of the prescription',
              },
              description: {
                type: 'string',
                description: 'General description or notes',
              },
              medications: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Name of the medication',
                    },
                    quantity: {
                      type: 'number',
                      description: 'Quantity to be taken per dose',
                    },
                    unit: {
                      type: 'string',
                      description: 'Unit of the medication',
                    },
                    frequency: {
                      type: 'string',
                      description: 'How often to take the medication',
                    },
                    duration: {
                      type: 'string',
                      description: 'Duration of the treatment',
                    },
                    indications: {
                      type: 'string',
                      description: 'Special instructions',
                    },
                    administrationRoute: {
                      type: 'string',
                      description: 'Route of administration',
                    },
                    description: {
                      type: 'string',
                      description: 'Additional notes',
                    },
                  },
                  required: [
                    'name',
                    'quantity',
                    'unit',
                    'frequency',
                    'duration',
                    'indications',
                    'administrationRoute',
                  ],
                },
                description: 'List of prescribed medications',
              },
            },
            required: ['name', 'description', 'medications'],
            description: 'Medical prescription with medications',
          },
        },
        required: [
          'appointmentId',
          'consultationReason',
          'symptoms',
          'treatment',
          'diagnostics',
          'physicalExams',
          'vitalSigns',
        ],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_all_clinic_histories',
      description: 'Retrieve a list of all clinic history records',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_clinic_history',
      description: 'Retrieve a specific clinic history record by its ID',
      parameters: {
        type: 'object',
        properties: {
          clinicHistoryId: {
            type: 'string',
            description:
              'The unique identifier (UUID) of the clinic history record',
          },
        },
        required: ['clinicHistoryId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_clinic_histories',
      description: 'Retrieve all clinic history records for a specific patient',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description: 'The unique identifier (UUID) of the patient',
          },
        },
        required: ['patientId'],
      },
    },
  },
];

const openaiTools: ChatCompletionTool[] = [
  ...patientTools,
  ...appointmentTools,
  ...clinicHistoryTools,
];

export interface DoctorContext {
  authToken: string;
  doctorId: string;
}

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly systemPrompt: string = `Eres el asistente del médico en un sistema de gestión de historias clínicas. Tu único propósito es ayudar al médico a ejecutar las siguientes funciones:

FUNCIONES DISPONIBLES:
- Pacientes: registrar, consultar, actualizar, eliminar pacientes y gestionar sus antecedentes médicos (alergias, medicamentos, historial médico, historial familiar).
- Citas: crear, consultar, actualizar, cancelar citas médicas.
- Historias clínicas: crear y consultar historias clínicas con diagnósticos, exámenes físicos, signos vitales y prescripciones.

REGLAS ESTRICTAS:
1. NO puedes desviarte de estas funciones. Si el médico solicita algo fuera de este alcance, responde que solo puedes ayudar con las funciones mencionadas.
2. NO puedes suponer información. Si falta algún dato requerido, DEBES solicitarlo explícitamente al médico antes de ejecutar cualquier función.
3. Al registrar un paciente o crear una historia clínica, guía al médico para realizar una anamnesis completa solicitando:
   - Datos personales del paciente (nombre, apellido, email, teléfono, género, fecha de nacimiento)
   - Motivo de consulta
   - Síntomas actuales (descripción detallada, inicio, duración, intensidad)
   - Antecedentes personales (enfermedades previas, cirugías, hospitalizaciones)
   - Antecedentes familiares (enfermedades hereditarias)
   - Alergias conocidas
   - Medicamentos actuales
4. Confirma con el médico antes de ejecutar cualquier acción que modifique datos.
5. Responde siempre en español.
6. Sé conciso y profesional en tus respuestas.`;

  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
    private readonly appointmentService: AppointmentService,
  ) {
    this.openai = new OpenAI({
      apiKey: environment.OPENAI_API_KEY,
    });
  }

  async processMessageFromDoctor(
    phoneNumber: string,
    userMessage: string,
    context?: DoctorContext,
  ): Promise<string> {
    const doctorId = context?.doctorId ?? (await this.resolveDoctorId(phoneNumber));

    const { conversation, messages: contextMessages } =
      await this.conversationService.getOrCreateActiveConversation(
        doctorId,
        this.systemPrompt,
      );

    await this.conversationService.addMessage(
      conversation.id,
      'user',
      userMessage,
    );

    const systemContent =
      context?.authToken != null
        ? `${this.systemPrompt}\n\nconversationContext.authToken = ${context.authToken}`
        : this.systemPrompt;

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemContent },
      ...contextMessages,
      { role: 'user', content: userMessage },
    ];

    const assistantResponse = await this.sendChatCompletion(
      chatMessages,
      doctorId,
    );

    await this.conversationService.addMessage(
      conversation.id,
      'assistant',
      assistantResponse,
    );

    return assistantResponse;
  }

  async processMessageInConversation(
    doctorId: string,
    conversationId: string,
    context?: DoctorContext,
  ): Promise<string> {
    const contextMessages =
      await this.conversationService.getContextForConversation(
        conversationId,
        doctorId,
      );

    const systemContent =
      context?.authToken != null
        ? `${this.systemPrompt}\n\nconversationContext.authToken = ${context.authToken}`
        : this.systemPrompt;

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemContent },
      ...contextMessages,
    ];

    const assistantResponse = await this.sendChatCompletion(
      chatMessages,
      doctorId,
    );

    await this.conversationService.addMessage(
      conversationId,
      'assistant',
      assistantResponse,
    );

    return assistantResponse;
  }

  private async resolveDoctorId(phoneNumber: string): Promise<string> {
    const doctorInfo =
      await this.conversationService.findDoctorByPhone(phoneNumber);
    if (!doctorInfo) {
      throw new NotFoundException('doctor-not-found-by-phone');
    }
    return doctorInfo.doctorId;
  }

  private async sendChatCompletion(
    messages: ChatMessage[],
    doctorId: string,
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: environment.OPENAI_MODEL,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      tools: openaiTools,
      tool_choice: 'auto',
    });

    const assistantMessage = response.choices[0]?.message;

    if (
      assistantMessage?.tool_calls &&
      assistantMessage.tool_calls.length > 0
    ) {
      return this.handleToolCalls(assistantMessage, messages, doctorId);
    }

    return (
      assistantMessage?.content ||
      'No pude procesar tu solicitud. Por favor, intenta de nuevo.'
    );
  }

  private async handleToolCalls(
    assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage,
    previousMessages: ChatMessage[],
    doctorId: string,
  ): Promise<string> {
    const toolResults: Array<OpenAI.Chat.Completions.ChatCompletionToolMessageParam> =
      [];

    for (const toolCall of assistantMessage.tool_calls || []) {
      if (toolCall.type !== 'function') continue;

      const functionName = toolCall.function.name;
      const functionArgs = this.safeParseJsonRecord(
        toolCall.function.arguments,
      );

      const result = await this.executeToolFunction(
        doctorId,
        functionName,
        functionArgs,
      );

      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        content: JSON.stringify(result),
      });
    }

    const followUpMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      [
        ...previousMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: 'assistant' as const,
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls,
        },
        ...toolResults,
      ];

    const followUpResponse = await this.openai.chat.completions.create({
      model: environment.OPENAI_MODEL,
      messages: followUpMessages,
    });

    return (
      followUpResponse.choices[0]?.message?.content || 'Operación completada.'
    );
  }

  private safeParseJsonRecord(json: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private formatAppointmentsForWhatsApp(
    appointments: AppointmentResponseDto[],
  ): string {
    if (appointments.length === 0) {
      return 'No hay consultas para hoy.';
    }
    const lines = appointments.map((apt, i) => {
      const date = new Date(apt.startAppointment);
      const dateStr = date.toISOString().slice(0, 10);
      const timeStr = date.toISOString().slice(11, 16);
      const patientName = `${apt.patient.name} ${apt.patient.lastName}`;
      const reason = apt.reason || '-';
      const status = apt.status;
      return `${i + 1}. ${dateStr} ${timeStr} | ${patientName} | ${reason} | ${status}`;
    });
    return lines.join('\n');
  }

  private async ensurePatientOwnership(
    patientId: string,
    doctorId: string,
  ): Promise<void> {
    const hasAppointment = await this.prisma.appointment.findFirst({
      where: { patientId, doctorId },
    });
    if (!hasAppointment) {
      throw new ForbiddenException('patient-not-owned-by-doctor');
    }
  }

  private async executeToolFunction(
    doctorId: string,
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (functionName) {
      case 'register_patient':
        return this.prisma.user.create({
          data: {
            email: args.email as string,
            name: args.name as string,
            lastName: args.lastName as string,
            phone: args.phone as string,
            password: args.password as string | undefined,
            patient: {
              create: {
                gender: args.gender as string | undefined,
                birthDate: args.birthDate
                  ? new Date(args.birthDate as string)
                  : undefined,
                allergies: [],
                medications: [],
                medicalHistory: [],
                familyHistory: [],
              },
            },
          },
          include: { patient: true },
        });

      case 'get_all_patients':
        return this.prisma.patient.findMany({
          where: {
            appointments: { some: { doctorId } },
          },
          include: {
            user: {
              select: { name: true, lastName: true, email: true, phone: true },
            },
          },
        });

      case 'get_patient': {
        const patient = await this.prisma.patient.findUnique({
          where: { id: args.patientId as string },
          include: {
            user: {
              select: { name: true, lastName: true, email: true, phone: true },
            },
          },
        });
        if (!patient) {
          throw new NotFoundException('patient-not-found');
        }
        await this.ensurePatientOwnership(patient.id, doctorId);
        return patient;
      }

      case 'update_patient': {
        await this.ensurePatientOwnership(args.patientId as string, doctorId);
        return this.prisma.patient.update({
          where: { id: args.patientId as string },
          data: {
            gender: args.gender as string | undefined,
            birthDate: args.birthDate
              ? new Date(args.birthDate as string)
              : undefined,
            user: {
              update: {
                email: args.email as string | undefined,
                name: args.name as string | undefined,
                lastName: args.lastName as string | undefined,
                phone: args.phone as string | undefined,
                password: args.password as string | undefined,
              },
            },
          },
          include: { user: true },
        });
      }

      case 'delete_patient': {
        await this.ensurePatientOwnership(args.patientId as string, doctorId);
        return this.prisma.patient.delete({
          where: { id: args.patientId as string },
        });
      }

      case 'get_patient_antecedents': {
        await this.ensurePatientOwnership(args.patientId as string, doctorId);
        return this.prisma.patient.findUnique({
          where: { id: args.patientId as string },
          select: {
            allergies: true,
            medications: true,
            medicalHistory: true,
            familyHistory: true,
          },
        });
      }

      case 'update_patient_antecedents': {
        await this.ensurePatientOwnership(args.patientId as string, doctorId);
        return this.prisma.patient.update({
          where: { id: args.patientId as string },
          data: {
            allergies: args.allergies as string[] | undefined,
            medications: args.medications as string[] | undefined,
            medicalHistory: args.medicalHistory as string[] | undefined,
            familyHistory: args.familyHistory as string[] | undefined,
          },
        });
      }

      case 'create_appointment':
        return this.prisma.appointment.create({
          data: {
            patientId: args.patientId as string,
            doctorId,
            specialtyId: args.specialtyId as string,
            reason: args.reason as string | undefined,
            startAppointment: new Date(args.startAppointment as string),
            endAppointment: new Date(args.endAppointment as string),
            status: 'pending',
          },
        });

      case 'get_all_appointments':
        return this.prisma.appointment.findMany({
          where: { doctorId },
          include: {
            patient: {
              include: { user: { select: { name: true, lastName: true } } },
            },
            doctor: {
              include: { user: { select: { name: true, lastName: true } } },
            },
          },
        });

      case 'get_appointment': {
        const appointment = await this.prisma.appointment.findUnique({
          where: { id: args.appointmentId as string },
          include: {
            patient: {
              include: { user: { select: { name: true, lastName: true } } },
            },
            doctor: {
              include: { user: { select: { name: true, lastName: true } } },
            },
          },
        });
        if (!appointment) {
          throw new NotFoundException('appointment-not-found');
        }
        if (appointment.doctorId !== doctorId) {
          throw new ForbiddenException('appointment-not-owned-by-doctor');
        }
        return appointment;
      }

      case 'update_appointment': {
        const existingAppointment = await this.prisma.appointment.findUnique({
          where: { id: args.appointmentId as string },
        });
        if (!existingAppointment) {
          throw new NotFoundException('appointment-not-found');
        }
        if (existingAppointment.doctorId !== doctorId) {
          throw new ForbiddenException('appointment-not-owned-by-doctor');
        }
        return this.prisma.appointment.update({
          where: { id: args.appointmentId as string },
          data: {
            startAppointment: args.startAppointment
              ? new Date(args.startAppointment as string)
              : undefined,
            endAppointment: args.endAppointment
              ? new Date(args.endAppointment as string)
              : undefined,
            status: args.status as string | undefined,
            reason: args.reason as string | undefined,
          },
        });
      }

      case 'cancel_appointment': {
        const appointmentToCancel = await this.prisma.appointment.findUnique({
          where: { id: args.appointmentId as string },
        });
        if (!appointmentToCancel) {
          throw new NotFoundException('appointment-not-found');
        }
        if (appointmentToCancel.doctorId !== doctorId) {
          throw new ForbiddenException('appointment-not-owned-by-doctor');
        }
        return this.prisma.appointment.update({
          where: { id: args.appointmentId as string },
          data: { status: 'cancelled' },
        });
      }

      case 'get_patient_appointments':
        return this.prisma.appointment.findMany({
          where: {
            patientId: args.patientId as string,
            doctorId,
          },
          include: {
            doctor: {
              include: { user: { select: { name: true, lastName: true } } },
            },
          },
        });

      case 'getTodaysAppointments': {
        const dateArg =
          typeof args.date === 'string' ? args.date : undefined;
        const todaysAppointments =
          await this.appointmentService.findTodaysByDoctor(doctorId, dateArg);
        const formatted = this.formatAppointmentsForWhatsApp(todaysAppointments);
        return { formattedMessage: formatted };
      }

      case 'create_clinic_history': {
        const appointment = await this.prisma.appointment.findUnique({
          where: { id: args.appointmentId as string },
        });
        if (!appointment) {
          throw new NotFoundException('appointment-not-found');
        }
        if (appointment.doctorId !== doctorId) {
          throw new ForbiddenException('appointment-not-owned-by-doctor');
        }
        return this.prisma.clinicHistory.create({
          data: {
            appointmentId: args.appointmentId as string,
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            specialtyId: appointment.specialtyId,
            consultationReason: args.consultationReason as string,
            symptoms: args.symptoms as string[],
            treatment: args.treatment as string,
            diagnostics: {
              create: (
                args.diagnostics as Array<{ name: string; description: string }>
              ).map((d) => ({
                name: d.name,
                description: d.description,
              })),
            },
            physicalExams: {
              create: (
                args.physicalExams as Array<{
                  name: string;
                  description: string;
                }>
              ).map((p) => ({
                name: p.name,
                description: p.description,
              })),
            },
            vitalSigns: {
              create: (
                args.vitalSigns as Array<{
                  name: string;
                  value: string;
                  unit: string;
                  measurement: string;
                  description?: string;
                }>
              ).map((v) => ({
                name: v.name,
                value: v.value,
                unit: v.unit,
                measurement: v.measurement,
                description: v.description,
              })),
            },
          },
        });
      }

      case 'get_all_clinic_histories':
        return this.prisma.clinicHistory.findMany({
          where: { doctorId },
          include: {
            patient: {
              include: { user: { select: { name: true, lastName: true } } },
            },
            diagnostics: true,
            vitalSigns: true,
          },
        });

      case 'get_clinic_history': {
        const clinicHistory = await this.prisma.clinicHistory.findUnique({
          where: { id: args.clinicHistoryId as string },
          include: {
            patient: {
              include: { user: { select: { name: true, lastName: true } } },
            },
            diagnostics: true,
            physicalExams: true,
            vitalSigns: true,
            prescription: { include: { prescriptionMedications: true } },
          },
        });
        if (!clinicHistory) {
          throw new NotFoundException('clinic-history-not-found');
        }
        if (clinicHistory.doctorId !== doctorId) {
          throw new ForbiddenException('clinic-history-not-owned-by-doctor');
        }
        return clinicHistory;
      }

      case 'get_patient_clinic_histories':
        return this.prisma.clinicHistory.findMany({
          where: {
            patientId: args.patientId as string,
            doctorId,
          },
          include: {
            diagnostics: true,
            vitalSigns: true,
            prescription: true,
          },
        });

      default:
        return { error: `Función no reconocida: ${functionName}` };
    }
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }
}
