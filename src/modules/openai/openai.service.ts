import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import OpenAI from 'openai';
import { MessageOpenaiDto } from './dto/message-openai.dto';
import environment from 'src/core/config/environments';

type OpenAITool = OpenAI.Responses.Tool;

const patientTools: OpenAITool[] = [
  {
    type: 'function',
    name: 'register_patient',
    description: 'Register a new patient in the system',
    parameters: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Email address of the patient',
        },
        name: {
          type: 'string',
          description: 'First name of the patient',
        },
        lastName: {
          type: 'string',
          description: 'Last name of the patient',
        },
        phone: {
          type: 'string',
          description: 'Phone number of the patient in international format (e.g., +584241234567)',
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
          description: 'Birth date of the patient in ISO 8601 format (e.g., 1990-05-15)',
        },
      },
      required: ['email', 'name', 'lastName', 'phone'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_all_patients',
    description: 'Retrieve a list of all registered patients',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
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
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'update_patient',
    description: 'Update an existing patient information',
    parameters: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'The unique identifier (UUID) of the patient to update',
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
          description: 'New birth date of the patient in ISO 8601 format',
        },
      },
      required: ['patientId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'delete_patient',
    description: 'Delete a patient from the system',
    parameters: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'The unique identifier (UUID) of the patient to delete',
        },
      },
      required: ['patientId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_patient_antecedents',
    description: 'Retrieve the medical antecedents of a patient (allergies, medications, medical history, family history)',
    parameters: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'The unique identifier (UUID) of the patient',
        },
      },
      required: ['patientId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
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
          description: 'List of current medications the patient is taking',
        },
        medicalHistory: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of past medical conditions or surgeries',
        },
        familyHistory: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of family medical history items',
        },
      },
      required: ['patientId'],
      additionalProperties: false,
    },
    strict: true,
  },
];

const appointmentTools: OpenAITool[] = [
  {
    type: 'function',
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
          description: 'The unique identifier (UUID) of the medical specialty',
        },
        startAppointment: {
          type: 'string',
          description: 'Start date and time of the appointment in ISO 8601 format (e.g., 2026-01-20T09:00:00.000Z)',
        },
        endAppointment: {
          type: 'string',
          description: 'End date and time of the appointment in ISO 8601 format (e.g., 2026-01-20T09:30:00.000Z)',
        },
      },
      required: ['patientId', 'doctorId', 'specialtyId', 'startAppointment', 'endAppointment'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_all_appointments',
    description: 'Retrieve a list of all appointments',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
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
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'update_appointment',
    description: 'Update an existing appointment',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'The unique identifier (UUID) of the appointment to update',
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
          description: 'New status of the appointment',
        },
      },
      required: ['appointmentId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'cancel_appointment',
    description: 'Cancel an existing appointment',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'The unique identifier (UUID) of the appointment to cancel',
        },
      },
      required: ['appointmentId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
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
      additionalProperties: false,
    },
    strict: true,
  },
];

const clinicHistoryTools: OpenAITool[] = [
  {
    type: 'function',
    name: 'create_clinic_history',
    description: 'Create a new clinic history record for an appointment',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'The unique identifier (UUID) of the associated appointment',
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
              name: {
                type: 'string',
                description: 'Name of the diagnosis',
              },
              description: {
                type: 'string',
                description: 'Detailed description of the diagnosis',
              },
            },
            required: ['name', 'description'],
            additionalProperties: false,
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
            additionalProperties: false,
          },
          description: 'List of physical examinations performed',
        },
        vitalSigns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the vital sign (e.g., blood pressure, heart rate)',
              },
              value: {
                type: 'string',
                description: 'Measured value of the vital sign',
              },
              unit: {
                type: 'string',
                description: 'Unit of measurement (e.g., mmHg, bpm)',
              },
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
            additionalProperties: false,
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
              description: 'General description or notes for the prescription',
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
                    description: 'Unit of the medication (e.g., mg, ml)',
                  },
                  frequency: {
                    type: 'string',
                    description: 'How often to take the medication (e.g., every 8 hours)',
                  },
                  duration: {
                    type: 'string',
                    description: 'Duration of the treatment (e.g., 7 days)',
                  },
                  indications: {
                    type: 'string',
                    description: 'Special instructions for taking the medication',
                  },
                  administrationRoute: {
                    type: 'string',
                    description: 'Route of administration (e.g., oral, intravenous)',
                  },
                  description: {
                    type: 'string',
                    description: 'Additional notes about the medication',
                  },
                },
                required: ['name', 'quantity', 'unit', 'frequency', 'duration', 'indications', 'administrationRoute'],
                additionalProperties: false,
              },
              description: 'List of prescribed medications',
            },
          },
          required: ['name', 'description', 'medications'],
          additionalProperties: false,
          description: 'Medical prescription with medications',
        },
      },
      required: ['appointmentId', 'consultationReason', 'symptoms', 'treatment', 'diagnostics', 'physicalExams', 'vitalSigns'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_all_clinic_histories',
    description: 'Retrieve a list of all clinic history records',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_clinic_history',
    description: 'Retrieve a specific clinic history record by its ID',
    parameters: {
      type: 'object',
      properties: {
        clinicHistoryId: {
          type: 'string',
          description: 'The unique identifier (UUID) of the clinic history record',
        },
      },
      required: ['clinicHistoryId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
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
      additionalProperties: false,
    },
    strict: true,
  },
];

const openaiTools: OpenAITool[] = [
  ...patientTools,
  ...appointmentTools,
  ...clinicHistoryTools,
];

@Injectable()
export class OpenaiService {
  private instructions: string = `Eres el asistente del médico en un sistema de gestión de historias clínicas. Tu único propósito es ayudar al médico a ejecutar las siguientes funciones:

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

  constructor(private readonly prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: environment.OPENAI_API_KEY,
    });
  }

  async conversation(doctorId: string, sendMessageDto: MessageOpenaiDto) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        doctorId: doctorId,
      },
    });
    return this.sendMessage(this.instructions, sendMessageDto);
  }

  async sendMessage(instructions: string, sendMessageDto: MessageOpenaiDto) {
    const response: OpenAI.Responses.Response =
      await this.openai.responses.create({
        model: environment.OPENAI_MODEL,
        instructions: instructions,
        prompt: {
          id: '1',
          version: '1.0.0',
          variables: {},
        },
        tools: openaiTools,
        tool_choice: 'auto',
      });

    return response;
  }
}
