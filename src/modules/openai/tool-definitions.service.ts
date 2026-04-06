import OpenAI from 'openai';

type ChatCompletionTool = OpenAI.Chat.Completions.ChatCompletionTool;

export const patientTools: ChatCompletionTool[] = [
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

export const buscadorTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_specialties',
      description:
        'Lista las especialidades médicas del sistema. Devuelve id y nombre. Usa el id cuando el médico elija una especialidad por nombre; NUNCA muestres el id al médico.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_patients',
      description:
        'Busca pacientes del doctor por nombre o apellido. Devuelve id, patientNumber (número único), nombre y apellido. Presenta al médico por nombre o por número (ej. "1. Pedro González"). Para create_appointment usa el id (UUID) de la fila elegida; si envías patientNumber también se acepta.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Texto opcional para filtrar por nombre o apellido del paciente. Si no se envía, lista todos los pacientes del doctor.',
          },
        },
        required: [],
      },
    },
  },
];

export const appointmentTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_appointment',
      description:
        'Create a new medical appointment for the authenticated doctor. Never ask for or accept doctor ID; the appointment is always for the doctor in the conversation.',
      parameters: {
        type: 'object',
        properties: {
          patientId: {
            type: 'string',
            description:
              'The "id" (UUID) or "patientNumber" (numeric string, e.g. "1") from search_patients. Use the id of the row the doctor selected; if you send patientNumber it will be resolved to the patient UUID.',
          },
          specialtyId: {
            type: 'string',
            description:
              'The exact "id" (UUID string) from one of the objects returned by list_specialties. Never use the specialty name.',
          },
          startAppointment: {
            type: 'string',
            description:
              'Start date and time in ISO 8601 format (e.g. 2023-10-11T10:00:00)',
          },
          endAppointment: {
            type: 'string',
            description:
              'End date and time in ISO 8601 format (e.g. 2023-10-11T11:00:00)',
          },
        },
        required: [
          'patientId',
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
        "Retrieve today's appointments for the authenticated doctor. Optional date in ISO 8601 format to query another day.",
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

export const clinicHistoryTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_clinic_history',
      description:
        'Create a new clinic history record. Can be linked to an appointment (provide appointmentId) or created without one. When without appointment: ask the doctor for patientNumber and specialtyCode (do not ask for UUIDs). Request one piece of information at a time: e.g. first ask for patient number, then specialty code, then consultation reason, etc.',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: {
            type: 'string',
            description:
              'The unique identifier (UUID) of the associated appointment. Optional; if omitted, ask the doctor for patientNumber and specialtyCode (not UUIDs).',
          },
          patientId: {
            type: 'string',
            description:
              'UUID of the patient. Prefer asking the doctor for patientNumber instead when creating without appointment.',
          },
          specialtyId: {
            type: 'string',
            description:
              'UUID of the specialty. Prefer asking the doctor for specialtyCode instead when creating without appointment.',
          },
          patientNumber: {
            type: 'integer',
            description:
              'Patient number to ask the doctor for (from the numbered list in search_patients). When creating without appointment, ask the doctor for this number; do not ask for UUID. Must send together with specialtyCode.',
          },
          specialtyCode: {
            type: 'integer',
            description:
              'Specialty code to ask the doctor for (from the numbered list in list_specialties). When creating without appointment, ask the doctor for this code; do not ask for UUID. Must send together with patientNumber.',
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

export const openaiTools: ChatCompletionTool[] = [
  ...patientTools,
  ...buscadorTools,
  ...appointmentTools,
  ...clinicHistoryTools,
];
