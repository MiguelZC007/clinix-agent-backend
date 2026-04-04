import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ClinicHistoryService } from './clinic-history.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from 'src/prisma/__mocks__/prisma.service.mock';
import { CreateClinicHistoryDto } from './dto/create-clinic-history.dto';
import { CreateClinicHistoryWithoutAppointmentDto } from './dto/create-clinic-history-without-appointment.dto';
import { FindAllClinicHistoriesQueryDto } from './dto/find-all-clinic-histories-query.dto';
import {
  PrescriptionConflictType,
  PrescriptionConflict,
} from './dto/prescription-validation.dto';

describe('ClinicHistoryService', () => {
  let service: ClinicHistoryService;
  let prisma: MockPrismaService;

  const mockPatient = {
    id: 'patient-uuid',
    patientNumber: 1,
    registeredByDoctorId: 'doctor-uuid',
    user: { name: 'Juan', lastName: 'Pérez' },
  };

  const mockDoctor = {
    id: 'doctor-uuid',
    user: { name: 'María', lastName: 'González' },
    specialty: { name: 'Cardiología', specialtyCode: 1 },
  };

  const mockAppointment = {
    id: 'appointment-uuid',
    patientId: 'patient-uuid',
    doctorId: 'doctor-uuid',
    specialtyId: 'specialty-uuid',
    patient: mockPatient,
    doctor: mockDoctor,
    clinicHistory: null,
  };

  const mockClinicHistory = {
    id: 'clinic-history-uuid',
    patientId: 'patient-uuid',
    doctorId: 'doctor-uuid',
    specialtyId: 'specialty-uuid',
    appointmentId: 'appointment-uuid',
    consultationReason: 'Dolor de cabeza',
    symptoms: ['dolor', 'mareos'],
    treatment: 'Reposo y medicación',
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: mockPatient,
    doctor: mockDoctor,
    diagnostics: [
      {
        id: 'diagnostic-uuid',
        name: 'Migraña',
        description: 'Dolor de cabeza crónico',
        createdAt: new Date(),
      },
    ],
    physicalExams: [
      {
        id: 'exam-uuid',
        name: 'Examen neurológico',
        description: 'Normal',
        createdAt: new Date(),
      },
    ],
    vitalSigns: [
      {
        id: 'vital-uuid',
        name: 'Presión arterial',
        value: '120/80',
        unit: 'mmHg',
        measurement: 'sistólica/diastólica',
        description: null,
        createdAt: new Date(),
      },
    ],
    prescription: null,
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicHistoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClinicHistoryService>(ClinicHistoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateClinicHistoryDto = {
      appointmentId: 'appointment-uuid',
      consultationReason: 'Dolor de cabeza',
      symptoms: ['dolor', 'mareos'],
      treatment: 'Reposo y medicación',
      diagnostics: [
        { name: 'Migraña', description: 'Dolor de cabeza crónico' },
      ],
      physicalExams: [{ name: 'Examen neurológico', description: 'Normal' }],
      vitalSigns: [
        {
          name: 'Presión arterial',
          value: '120/80',
          unit: 'mmHg',
          measurement: 'sistólica/diastólica',
        },
      ],
    };

    it('debe crear una historia clínica exitosamente', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            appointment: {
              findUnique: prisma.appointment.findUnique,
            },
            patient: {
              findUnique: prisma.patient.findUnique,
            },
            clinicHistory: {
              create: prisma.clinicHistory.create,
            },
          };
          return callback(tx);
        },
      );
      // Mock patient ownership check
      prisma.patient.findUnique.mockResolvedValue({
        registeredByDoctorId: 'doctor-uuid',
      });
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      prisma.clinicHistory.create.mockResolvedValue(mockClinicHistory);

      const result = await service.create(createDto, 'doctor-uuid');

      expect(result).toBeDefined();
      expect(result.consultationReason).toBe('Dolor de cabeza');
    });

    it('debe lanzar NotFoundException si la cita no existe', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            appointment: {
              findUnique: prisma.appointment.findUnique,
            },
            patient: {
              findUnique: prisma.patient.findUnique,
            },
            clinicHistory: {
              create: prisma.clinicHistory.create,
            },
          };
          return callback(tx);
        },
      );
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'doctor-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ConflictException si la cita ya tiene historia clínica', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            appointment: {
              findUnique: prisma.appointment.findUnique,
            },
            patient: {
              findUnique: prisma.patient.findUnique,
            },
            clinicHistory: {
              create: prisma.clinicHistory.create,
            },
          };
          return callback(tx);
        },
      );
      prisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        clinicHistory: mockClinicHistory,
      });

      await expect(service.create(createDto, 'doctor-uuid')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('createWithoutAppointment', () => {
    const createWithoutAppointmentDto: CreateClinicHistoryWithoutAppointmentDto =
      {
        patientId: 'patient-uuid',
        specialtyId: 'specialty-uuid',
        consultationReason: 'Dolor de cabeza',
        symptoms: ['dolor', 'mareos'],
        treatment: 'Reposo y medicación',
        diagnostics: [
          { name: 'Migraña', description: 'Dolor de cabeza crónico' },
        ],
        physicalExams: [{ name: 'Examen neurológico', description: 'Normal' }],
        vitalSigns: [
          {
            name: 'Presión arterial',
            value: '120/80',
            unit: 'mmHg',
            measurement: 'sistólica/diastólica',
          },
        ],
      };

    const mockClinicHistoryWithoutAppointment = {
      ...mockClinicHistory,
      appointmentId: null,
    };

    beforeEach(() => {
      // Set up $transaction mock for callback form
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            patient: {
              findUnique: prisma.patient.findUnique,
            },
            specialty: {
              findUnique: prisma.specialty.findUnique,
            },
            doctor: {
              findUnique: prisma.doctor.findUnique,
            },
            clinicHistory: {
              create: prisma.clinicHistory.create,
            },
          };
          return callback(tx);
        },
      );
    });

    it('debe crear una historia clínica sin cita exitosamente', async () => {
      prisma.patient.findUnique.mockResolvedValue({
        ...mockPatient,
        registeredByDoctorId: 'doctor-uuid',
      });
      prisma.specialty.findUnique.mockResolvedValue({
        id: 'specialty-uuid',
        name: 'Cardiología',
      });
      prisma.doctor.findUnique.mockResolvedValue({
        ...mockDoctor,
        specialtyId: 'specialty-uuid',
      });
      prisma.clinicHistory.create.mockResolvedValue(
        mockClinicHistoryWithoutAppointment,
      );

      const result = await service.createWithoutAppointment(
        'doctor-uuid',
        createWithoutAppointmentDto,
      );

      expect(result).toBeDefined();
      expect(result.consultationReason).toBe('Dolor de cabeza');
      expect(result.appointmentId).toBeNull();
      expect(prisma.patient.findUnique).toHaveBeenCalledWith({
        where: { id: 'patient-uuid' },
        select: {
          id: true,
          registeredByDoctorId: true,
          allergies: true,
          medications: true,
        },
      });
      expect(prisma.specialty.findUnique).toHaveBeenCalledWith({
        where: { id: 'specialty-uuid' },
      });
      expect(prisma.doctor.findUnique).toHaveBeenCalledWith({
        where: { id: 'doctor-uuid' },
        include: { specialty: true },
      });
      expect(prisma.clinicHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: 'patient-uuid',
            doctorId: 'doctor-uuid',
            specialtyId: 'specialty-uuid',
            appointmentId: null,
            consultationReason: 'Dolor de cabeza',
          }),
        }),
      );
    });

    it('debe lanzar NotFoundException si el paciente no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.createWithoutAppointment(
          'doctor-uuid',
          createWithoutAppointmentDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si la especialidad no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue({
        ...mockPatient,
        registeredByDoctorId: 'doctor-uuid',
      });
      prisma.specialty.findUnique.mockResolvedValue(null);

      await expect(
        service.createWithoutAppointment(
          'doctor-uuid',
          createWithoutAppointmentDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe crear historia clínica sin cita usando patientNumber y specialtyCode', async () => {
      const dtoWithNumbers: CreateClinicHistoryWithoutAppointmentDto = {
        patientNumber: 1,
        specialtyCode: 1,
        consultationReason: 'Dolor de cabeza',
        symptoms: ['dolor', 'mareos'],
        treatment: 'Reposo y medicación',
        diagnostics: [
          { name: 'Migraña', description: 'Dolor de cabeza crónico' },
        ],
        physicalExams: [{ name: 'Examen neurológico', description: 'Normal' }],
        vitalSigns: [
          {
            name: 'Presión arterial',
            value: '120/80',
            unit: 'mmHg',
            measurement: 'sistólica/diastólica',
          },
        ],
      };
      const patientByNumber = {
        ...mockPatient,
        id: 'patient-uuid',
        registeredByDoctorId: 'doctor-uuid',
      };
      const specialtyByCode = {
        id: 'specialty-uuid',
        name: 'Cardiología',
        specialtyCode: 1,
      };
      prisma.patient.findUnique.mockResolvedValue(patientByNumber);
      prisma.specialty.findUnique.mockResolvedValue(specialtyByCode);
      prisma.doctor.findUnique.mockResolvedValue({
        ...mockDoctor,
        specialtyId: 'specialty-uuid',
      });
      prisma.clinicHistory.create.mockResolvedValue(
        mockClinicHistoryWithoutAppointment,
      );

      const result = await service.createWithoutAppointment(
        'doctor-uuid',
        dtoWithNumbers,
      );

      expect(result).toBeDefined();
      expect(result.appointmentId).toBeNull();
      expect(prisma.patient.findUnique).toHaveBeenCalledWith({
        where: { patientNumber: 1 },
        select: {
          id: true,
          registeredByDoctorId: true,
          allergies: true,
          medications: true,
        },
      });
      expect(prisma.specialty.findUnique).toHaveBeenCalledWith({
        where: { specialtyCode: 1 },
      });
      expect(prisma.clinicHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: 'patient-uuid',
            specialtyId: 'specialty-uuid',
          }),
        }),
      );
    });

    it('debe lanzar NotFoundException si no existe paciente con patientNumber', async () => {
      const dtoWithNumbers: CreateClinicHistoryWithoutAppointmentDto = {
        patientNumber: 999,
        specialtyCode: 1,
        consultationReason: 'Dolor de cabeza',
        symptoms: ['dolor'],
        treatment: 'Reposo',
        diagnostics: [{ name: 'X', description: 'Y' }],
        physicalExams: [{ name: 'A', description: 'B' }],
        vitalSigns: [
          {
            name: 'P',
            value: '120',
            unit: 'mmHg',
            measurement: 'M',
          },
        ],
      };
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.createWithoutAppointment('doctor-uuid', dtoWithNumbers),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.patient.findUnique).toHaveBeenCalledWith({
        where: { patientNumber: 999 },
        select: {
          id: true,
          registeredByDoctorId: true,
          allergies: true,
          medications: true,
        },
      });
    });

    it('debe lanzar NotFoundException si no existe especialidad con specialtyCode', async () => {
      const dtoWithNumbers: CreateClinicHistoryWithoutAppointmentDto = {
        patientNumber: 1,
        specialtyCode: 999,
        consultationReason: 'Dolor de cabeza',
        symptoms: ['dolor'],
        treatment: 'Reposo',
        diagnostics: [{ name: 'X', description: 'Y' }],
        physicalExams: [{ name: 'A', description: 'B' }],
        vitalSigns: [
          {
            name: 'P',
            value: '120',
            unit: 'mmHg',
            measurement: 'M',
          },
        ],
      };
      prisma.patient.findUnique.mockResolvedValue({
        ...mockPatient,
        registeredByDoctorId: 'doctor-uuid',
      });
      prisma.specialty.findUnique.mockResolvedValue(null);

      await expect(
        service.createWithoutAppointment('doctor-uuid', dtoWithNumbers),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.specialty.findUnique).toHaveBeenCalledWith({
        where: { specialtyCode: 999 },
      });
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      prisma.$transaction.mockImplementation((args: unknown[]) =>
        Promise.all(args as Promise<unknown>[]),
      );
      prisma.clinicHistory.findMany.mockResolvedValue([mockClinicHistory]);
      prisma.clinicHistory.count.mockResolvedValue(1);
    });

    it('debe retornar lista paginada de historias clínicas', async () => {
      const result = await service.findAll(
        { page: 1, pageSize: 10 },
        'doctor-uuid',
      );

      expect(result).toEqual({
        items: expect.any(Array),
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      });
      expect(result.items).toHaveLength(1);
      expect(prisma.clinicHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
      expect(prisma.clinicHistory.count).toHaveBeenCalledWith({
        where: { doctorId: 'doctor-uuid' },
      });
    });

    it('debe construir where con search cuando se pasa search', async () => {
      const query: FindAllClinicHistoriesQueryDto = {
        page: 1,
        pageSize: 10,
        search: 'dolor',
      };
      await service.findAll(query, 'doctor-uuid');

      const findManyCall = prisma.clinicHistory.findMany.mock.calls[0][0] as {
        where?: unknown;
      };
      expect(findManyCall.where).toBeDefined();
      expect(findManyCall.where).toHaveProperty('OR');
      const orConditions = (findManyCall.where as { OR: unknown[] }).OR;
      expect(orConditions.length).toBeGreaterThan(0);
      expect(prisma.clinicHistory.count).toHaveBeenCalledWith({
        where: findManyCall.where,
      });
    });

    it('debe construir where con patientId cuando se pasa patientId', async () => {
      const query: FindAllClinicHistoriesQueryDto = {
        page: 1,
        pageSize: 10,
        patientId: '123e4567-e89b-12d3-a456-426614174000',
      };
      await service.findAll(query, 'doctor-uuid');

      const findManyCall = prisma.clinicHistory.findMany.mock.calls[0][0] as {
        where?: { patientId?: string; doctorId?: string };
      };
      expect(findManyCall.where).toEqual({
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        doctorId: 'doctor-uuid',
      });
    });

    it('debe construir where con patientId cuando se pasa patientId', async () => {
      const query: FindAllClinicHistoriesQueryDto = {
        page: 1,
        pageSize: 10,
        patientId: '123e4567-e89b-12d3-a456-426614174000',
      };
      await service.findAll(query, 'doctor-uuid');

      const findManyCall = prisma.clinicHistory.findMany.mock.calls[0][0] as {
        where?: { patientId?: string; doctorId?: string };
      };
      expect(findManyCall.where).toEqual({
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        doctorId: 'doctor-uuid',
      });
    });

    it('debe construir where con createdAt cuando se pasa dateFrom', async () => {
      const query: FindAllClinicHistoriesQueryDto = {
        page: 1,
        pageSize: 10,
        dateFrom: '2026-01-01',
      };
      await service.findAll(query, 'doctor-uuid');

      const findManyCall = prisma.clinicHistory.findMany.mock.calls[0][0] as {
        where?: { createdAt?: { gte?: Date } };
      };
      expect(findManyCall.where).toHaveProperty('createdAt');
      expect(findManyCall.where?.createdAt).toHaveProperty('gte');
      expect(
        (findManyCall.where?.createdAt?.gte as Date).toISOString(),
      ).toContain('2026-01-01');
    });

    it('debe construir where con createdAt cuando se pasa dateTo', async () => {
      const query: FindAllClinicHistoriesQueryDto = {
        page: 1,
        pageSize: 10,
        dateTo: '2026-12-31',
      };
      await service.findAll(query, 'doctor-uuid');

      const findManyCall = prisma.clinicHistory.findMany.mock.calls[0][0] as {
        where?: { createdAt?: { lte?: Date } };
      };
      expect(findManyCall.where).toHaveProperty('createdAt');
      expect(findManyCall.where?.createdAt).toHaveProperty('lte');
    });

    it('debe construir where con AND cuando se combinan filtros', async () => {
      const query: FindAllClinicHistoriesQueryDto = {
        page: 1,
        pageSize: 10,
        patientId: '123e4567-e89b-12d3-a456-426614174000',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      };
      await service.findAll(query, 'doctor-uuid');

      const findManyCall = prisma.clinicHistory.findMany.mock.calls[0][0] as {
        where?: { AND?: unknown[] };
      };
      expect(findManyCall.where).toHaveProperty('AND');
      const and = (findManyCall.where as { AND: unknown[] }).AND;
      expect(and.length).toBeGreaterThanOrEqual(2);
    });

    it('debe mantener paginación intacta con filtros', async () => {
      const query: FindAllClinicHistoriesQueryDto = {
        page: 2,
        pageSize: 5,
        search: 'test',
      };
      const result = await service.findAll(query, 'doctor-uuid');

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
      expect(prisma.clinicHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debe retornar una historia clínica por ID', async () => {
      prisma.clinicHistory.findUnique.mockResolvedValue(mockClinicHistory);

      const result = await service.findOne(
        'clinic-history-uuid',
        'doctor-uuid',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('clinic-history-uuid');
    });

    it('debe retornar appointmentId null cuando la historia no tiene cita asociada', async () => {
      const withoutAppointment = {
        ...mockClinicHistory,
        appointmentId: null,
      };
      prisma.clinicHistory.findUnique.mockResolvedValue(withoutAppointment);

      const result = await service.findOne(
        'clinic-history-uuid',
        'doctor-uuid',
      );

      expect(result).toBeDefined();
      expect(result.appointmentId).toBeNull();
    });

    it('debe lanzar NotFoundException si la historia no existe', async () => {
      prisma.clinicHistory.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('invalid-uuid', 'doctor-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPatient', () => {
    it('debe retornar historias clínicas de un paciente', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.clinicHistory.findMany.mockResolvedValue([mockClinicHistory]);

      const result = await service.findByPatient('patient-uuid', 'doctor-uuid');

      expect(result).toHaveLength(1);
      expect(prisma.clinicHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'patient-uuid', doctorId: 'doctor-uuid' },
        }),
      );
    });

    it('debe lanzar NotFoundException si el paciente no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.findByPatient('invalid-uuid', 'doctor-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si el paciente no pertenece al doctor', async () => {
      const otherDoctorPatient = {
        ...mockPatient,
        registeredByDoctorId: 'other-doctor-uuid',
      };
      prisma.patient.findUnique.mockResolvedValue(otherDoctorPatient);

      await expect(
        service.findByPatient('patient-uuid', 'doctor-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validatePrescriptionAgainstPatient', () => {
    // Helper to set up $transaction mock with patient allergies/medications
    const setupTransactionWithPatientData = (
      prisma: MockPrismaService,
      patientData: { allergies?: string[]; medications?: string[] },
    ) => {
      const patientWithData = {
        ...mockPatient,
        allergies: patientData.allergies ?? [],
        medications: patientData.medications ?? [],
      };
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            appointment: {
              findUnique: prisma.appointment.findUnique,
            },
            patient: {
              findUnique: prisma.patient.findUnique.mockResolvedValue(
                patientWithData,
              ),
            },
            clinicHistory: {
              create: prisma.clinicHistory.create,
            },
          };
          return callback(tx);
        },
      );
      return patientWithData;
    };

    describe('create with prescription - allergy blocking', () => {
      const createDtoWithPrescription: CreateClinicHistoryDto = {
        appointmentId: 'appointment-uuid',
        consultationReason: 'Dolor de cabeza',
        symptoms: ['dolor', 'mareos'],
        treatment: 'Reposo y medicación',
        diagnostics: [
          { name: 'Migraña', description: 'Dolor de cabeza crónico' },
        ],
        physicalExams: [{ name: 'Examen neurológico', description: 'Normal' }],
        vitalSigns: [
          {
            name: 'Presión arterial',
            value: '120/80',
            unit: 'mmHg',
            measurement: 'sistólica/diastólica',
          },
        ],
        prescription: {
          name: 'Receta para migraña',
          description: 'Tratamiento para migraña',
          medications: [
            {
              name: 'Penicilina V',
              quantity: 30,
              unit: 'tabletas',
              frequency: 'Cada 8 horas',
              duration: '7 días',
              indications: 'Tomar con alimentos',
              administrationRoute: 'Oral',
            },
          ],
        },
      };

      it('debe bloquear prescripción cuando medicamento coincide con alergia del paciente (case-insensitive)', async () => {
        // Patient is allergic to "penicilina"
        setupTransactionWithPatientData(prisma, {
          allergies: ['penicilina', 'aspirina'],
        });
        prisma.appointment.findUnique.mockResolvedValue(mockAppointment);

        await expect(
          service.create(createDtoWithPrescription, 'doctor-uuid'),
        ).rejects.toThrow(BadRequestException);
      });

      it('debe bloquear prescripción y reportar todos los conflictos de alergia', async () => {
        // Patient allergic to multiple items that match prescribed medications
        setupTransactionWithPatientData(prisma, {
          allergies: ['sulfa', 'penicilina'],
        });
        prisma.appointment.findUnique.mockResolvedValue(mockAppointment);

        try {
          await service.create(createDtoWithPrescription, 'doctor-uuid');
          fail('Expected BadRequestException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const response = (error as BadRequestException).getResponse() as Record<string, unknown>;
          expect(response).toHaveProperty('code', 'PRESCRIPTION_ALLERGY_CONFLICT');
          expect(response).toHaveProperty('conflicts');
          const conflicts = response.conflicts as PrescriptionConflict[];
          expect(conflicts).toBeInstanceOf(Array);
          expect(conflicts.length).toBeGreaterThan(0);
          // Verify the conflict has required fields
          conflicts.forEach((conflict) => {
            expect(conflict).toHaveProperty('medication');
            expect(conflict).toHaveProperty('matchedAgainst');
            expect(conflict).toHaveProperty('type', PrescriptionConflictType.ALLERGY);
          });
        }
      });

      it('debe bloquear con alergia aunque tenga mayúsculas/minúsculas diferentes', async () => {
        // Patient allergic to "PENICILINA" (uppercase)
        setupTransactionWithPatientData(prisma, {
          allergies: ['PENICILINA'],
        });
        prisma.appointment.findUnique.mockResolvedValue(mockAppointment);

        await expect(
          service.create(createDtoWithPrescription, 'doctor-uuid'),
        ).rejects.toThrow(BadRequestException);
      });

      it('debe permitir prescripción cuando paciente no tiene alergias', async () => {
        const patientNoAllergies = setupTransactionWithPatientData(prisma, {
          allergies: [],
          medications: [],
        });
        prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
        prisma.clinicHistory.create.mockResolvedValue({
          ...mockClinicHistory,
          patient: patientNoAllergies,
          prescription: {
            id: 'prescription-uuid',
            name: 'Receta para migraña',
            description: 'Tratamiento para migraña',
            createdAt: new Date(),
            prescriptionMedications: [
              {
                id: 'med-uuid',
                name: 'Penicilina V',
                quantity: 30,
                unit: 'tabletas',
                frequency: 'Cada 8 horas',
                duration: '7 días',
                indications: 'Tomar con alimentos',
                administrationRoute: 'Oral',
                description: null,
              },
            ],
          },
        });

        const result = await service.create(createDtoWithPrescription, 'doctor-uuid');
        expect(result).toBeDefined();
        expect(result.prescription).toBeDefined();
        expect(result.warnings ?? []).toHaveLength(0);
      });
    });

    describe('create with prescription - medication warning', () => {
      const createDtoWithPrescription: CreateClinicHistoryDto = {
        appointmentId: 'appointment-uuid',
        consultationReason: 'Dolor de cabeza',
        symptoms: ['dolor', 'mareos'],
        treatment: 'Reposo y medicación',
        diagnostics: [
          { name: 'Migraña', description: 'Dolor de cabeza crónico' },
        ],
        physicalExams: [{ name: 'Examen neurológico', description: 'Normal' }],
        vitalSigns: [
          {
            name: 'Presión arterial',
            value: '120/80',
            unit: 'mmHg',
            measurement: 'sistólica/diastólica',
          },
        ],
        prescription: {
          name: 'Receta para migraña',
          description: 'Tratamiento para migraña',
          medications: [
            {
              name: 'Metformina',
              quantity: 30,
              unit: 'tabletas',
              frequency: 'Cada 12 horas',
              duration: '30 días',
              indications: 'Tomar con alimentos',
              administrationRoute: 'Oral',
            },
          ],
        },
      };

      it('debe crear prescripción y retornar warning cuando medicamento coincide con medicación actual del paciente', async () => {
        // Patient is on "metformina 500mg"
        const patientWithMed = setupTransactionWithPatientData(prisma, {
          allergies: [],
          medications: ['metformina 500mg'],
        });
        prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
        prisma.clinicHistory.create.mockResolvedValue({
          ...mockClinicHistory,
          patient: patientWithMed,
          prescription: {
            id: 'prescription-uuid',
            name: 'Receta para migraña',
            description: 'Tratamiento para migraña',
            createdAt: new Date(),
            prescriptionMedications: [
              {
                id: 'med-uuid',
                name: 'Metformina',
                quantity: 30,
                unit: 'tabletas',
                frequency: 'Cada 12 horas',
                duration: '30 días',
                indications: 'Tomar con alimentos',
                administrationRoute: 'Oral',
                description: null,
              },
            ],
          },
        });

        const result = await service.create(createDtoWithPrescription, 'doctor-uuid');

        expect(result).toBeDefined();
        expect(result.prescription).toBeDefined();
        expect(result).toHaveProperty('warnings');
        const warnings = (result as unknown as { warnings: PrescriptionConflict[] }).warnings;
        expect(warnings).toBeInstanceOf(Array);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].type).toBe(PrescriptionConflictType.MEDICATION);
      });

      it('debe acumular múltiples advertencias de medicamentos', async () => {
        // Patient is on multiple medications
        const patientWithMeds = setupTransactionWithPatientData(prisma, {
          allergies: [],
          medications: ['aspirina', 'omeprazol'],
        });
        prisma.appointment.findUnique.mockResolvedValue(mockAppointment);

        const dtoWithMultipleMeds: CreateClinicHistoryDto = {
          ...createDtoWithPrescription,
          prescription: {
            name: 'Receta para migraña',
            description: 'Tratamiento para migraña',
            medications: [
              {
                name: 'Aspirina',
                quantity: 30,
                unit: 'tabletas',
                frequency: 'Cada 8 horas',
                duration: '7 días',
                indications: 'Tomar con alimentos',
                administrationRoute: 'Oral',
              },
              {
                name: 'Omeprazol',
                quantity: 30,
                unit: 'tabletas',
                frequency: 'Cada 24 horas',
                duration: '30 días',
                indications: 'Tomar en ayunas',
                administrationRoute: 'Oral',
              },
            ],
          },
        };

        prisma.clinicHistory.create.mockResolvedValue({
          ...mockClinicHistory,
          patient: patientWithMeds,
          prescription: {
            id: 'prescription-uuid',
            name: 'Receta para migraña',
            description: 'Tratamiento para migraña',
            createdAt: new Date(),
            prescriptionMedications: [],
          },
        });

        const result = await service.create(dtoWithMultipleMeds, 'doctor-uuid');

        expect(result).toBeDefined();
        expect(result).toHaveProperty('warnings');
        const warnings = (result as unknown as { warnings: PrescriptionConflict[] }).warnings;
        expect(warnings.length).toBe(2);
      });

      it('debe crear prescripción exitosamente cuando no hay conflictos', async () => {
        const patientClean = setupTransactionWithPatientData(prisma, {
          allergies: [],
          medications: [],
        });
        prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
        prisma.clinicHistory.create.mockResolvedValue({
          ...mockClinicHistory,
          patient: patientClean,
          prescription: {
            id: 'prescription-uuid',
            name: 'Receta para migraña',
            description: 'Tratamiento para migraña',
            createdAt: new Date(),
            prescriptionMedications: [],
          },
        });

        const result = await service.create(createDtoWithPrescription, 'doctor-uuid');

        expect(result).toBeDefined();
        expect(result.warnings ?? []).toHaveLength(0);
      });
    });

    describe('createWithoutAppointment with prescription - allergy blocking', () => {
      // DTO for allergy blocking tests (patient has allergy to penicilina)
      const createWithoutAppointmentDtoWithAllergy: CreateClinicHistoryWithoutAppointmentDto = {
        patientId: 'patient-uuid',
        specialtyId: 'specialty-uuid',
        consultationReason: 'Dolor de cabeza',
        symptoms: ['dolor', 'mareos'],
        treatment: 'Reposo y medicación',
        diagnostics: [
          { name: 'Migraña', description: 'Dolor de cabeza crónico' },
        ],
        physicalExams: [{ name: 'Examen neurológico', description: 'Normal' }],
        vitalSigns: [
          {
            name: 'Presión arterial',
            value: '120/80',
            unit: 'mmHg',
            measurement: 'sistólica/diastólica',
          },
        ],
        prescription: {
          name: 'Receta para migraña',
          description: 'Tratamiento para migraña',
          medications: [
            {
              name: 'Penicilina V',
              quantity: 30,
              unit: 'tabletas',
              frequency: 'Cada 8 horas',
              duration: '7 días',
              indications: 'Tomar con alimentos',
              administrationRoute: 'Oral',
            },
          ],
        },
      };

      beforeEach(() => {
        prisma.$transaction.mockImplementation(
          async (callback: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              patient: {
                findUnique: prisma.patient.findUnique,
              },
              specialty: {
                findUnique: prisma.specialty.findUnique,
              },
              doctor: {
                findUnique: prisma.doctor.findUnique,
              },
              clinicHistory: {
                create: prisma.clinicHistory.create,
              },
            };
            return callback(tx);
          },
        );
      });

      it('debe bloquear prescripción en createWithoutAppointment cuando hay conflicto de alergia', async () => {
        const patientWithAllergy = {
          ...mockPatient,
          allergies: ['penicilina'],
          medications: [],
        };
        prisma.patient.findUnique.mockResolvedValue(patientWithAllergy);
        prisma.specialty.findUnique.mockResolvedValue({
          id: 'specialty-uuid',
          name: 'Cardiología',
        });
        prisma.doctor.findUnique.mockResolvedValue({
          ...mockDoctor,
          specialtyId: 'specialty-uuid',
        });

        await expect(
          service.createWithoutAppointment('doctor-uuid', createWithoutAppointmentDtoWithAllergy),
        ).rejects.toThrow(BadRequestException);
      });

      it('debe retornar warning en createWithoutAppointment cuando hay conflicto de medicación', async () => {
        // Patient with medicación but NO allergy - should get warning but prescription created
        const patientWithMed = {
          ...mockPatient,
          allergies: [],
          medications: ['metformina 500mg'],
        };
        prisma.patient.findUnique.mockResolvedValue(patientWithMed);
        prisma.specialty.findUnique.mockResolvedValue({
          id: 'specialty-uuid',
          name: 'Cardiología',
        });
        prisma.doctor.findUnique.mockResolvedValue({
          ...mockDoctor,
          specialtyId: 'specialty-uuid',
        });
        prisma.clinicHistory.create.mockResolvedValue({
          ...mockClinicHistory,
          appointmentId: null,
          patient: patientWithMed,
          prescription: {
            id: 'prescription-uuid',
            name: 'Receta para migraña',
            description: 'Tratamiento para migraña',
            createdAt: new Date(),
            prescriptionMedications: [],
          },
        });

        // DTO with Metformina to match patient's "metformina 500mg"
        const dtoWithMetformina: CreateClinicHistoryWithoutAppointmentDto = {
          ...createWithoutAppointmentDtoWithAllergy,
          prescription: {
            name: 'Receta para diabetes',
            description: 'Tratamiento para diabetes',
            medications: [
              {
                name: 'Metformina',
                quantity: 30,
                unit: 'tabletas',
                frequency: 'Cada 12 horas',
                duration: '30 días',
                indications: 'Tomar con alimentos',
                administrationRoute: 'Oral',
              },
            ],
          },
        };

        const result = await service.createWithoutAppointment(
          'doctor-uuid',
          dtoWithMetformina,
        );

        expect(result).toBeDefined();
        expect(result).toHaveProperty('warnings');
        const warnings = (result as unknown as { warnings: PrescriptionConflict[] }).warnings;
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].type).toBe(PrescriptionConflictType.MEDICATION);
      });
    });

    describe('edge cases', () => {
      it('debe manejar paciente sin alergias ni medicamentos de forma limpia', async () => {
        prisma.$transaction.mockImplementation(
          async (callback: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              appointment: {
                findUnique: prisma.appointment.findUnique,
              },
              patient: {
                findUnique: prisma.patient.findUnique.mockResolvedValue({
                  ...mockPatient,
                  allergies: [],
                  medications: [],
                }),
              },
              clinicHistory: {
                create: prisma.clinicHistory.create.mockResolvedValue({
                  ...mockClinicHistory,
                  prescription: null,
                }),
              },
            };
            return callback(tx);
          },
        );
        prisma.appointment.findUnique.mockResolvedValue(mockAppointment);

        const dtoNoPrescription: CreateClinicHistoryDto = {
          appointmentId: 'appointment-uuid',
          consultationReason: 'Dolor de cabeza',
          symptoms: ['dolor', 'mareos'],
          treatment: 'Reposo',
          diagnostics: [{ name: 'Migraña', description: 'Dolor de cabeza crónico' }],
          physicalExams: [{ name: 'Examen neurológico', description: 'Normal' }],
          vitalSigns: [
            {
              name: 'Presión arterial',
              value: '120/80',
              unit: 'mmHg',
              measurement: 'sistólica/diastólica',
            },
          ],
        };

        const result = await service.create(dtoNoPrescription, 'doctor-uuid');
        expect(result).toBeDefined();
        expect(result.warnings ?? []).toHaveLength(0);
      });

      it('debe manejar lista de medicamentos vacía en la prescripción', async () => {
        prisma.$transaction.mockImplementation(
          async (callback: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              appointment: {
                findUnique: prisma.appointment.findUnique,
              },
              patient: {
                findUnique: prisma.patient.findUnique.mockResolvedValue({
                  ...mockPatient,
                  allergies: ['penicilina'],
                  medications: [],
                }),
              },
              clinicHistory: {
                create: prisma.clinicHistory.create.mockResolvedValue({
                  ...mockClinicHistory,
                  prescription: null,
                }),
              },
            };
            return callback(tx);
          },
        );
        prisma.appointment.findUnique.mockResolvedValue(mockAppointment);

        const dtoEmptyMeds: CreateClinicHistoryDto = {
          appointmentId: 'appointment-uuid',
          consultationReason: 'Dolor de cabeza',
          symptoms: ['dolor', 'mareos'],
          treatment: 'Reposo',
          diagnostics: [{ name: 'Migraña', description: 'Dolor de cabeza crónico' }],
          physicalExams: [{ name: 'Examen neurológico', description: 'Normal' }],
          vitalSigns: [
            {
              name: 'Presión arterial',
              value: '120/80',
              unit: 'mmHg',
              measurement: 'sistólica/diastólica',
            },
          ],
          prescription: {
            name: 'Receta vacía',
            description: 'Sin medicamentos',
            medications: [],
          },
        };

        // With empty medications list, no validation should fail
        const result = await service.create(dtoEmptyMeds, 'doctor-uuid');
        expect(result).toBeDefined();
      });

      it('debe hacer matching substring (medicamento más largo contiene alergia)', async () => {
        prisma.$transaction.mockImplementation(
          async (callback: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              appointment: {
                findUnique: prisma.appointment.findUnique,
              },
              patient: {
                findUnique: prisma.patient.findUnique.mockResolvedValue({
                  ...mockPatient,
                  allergies: ['sulfa'],
                  medications: [],
                }),
              },
              clinicHistory: {
                create: prisma.clinicHistory.create,
              },
            };
            return callback(tx);
          },
        );
        prisma.appointment.findUnique.mockResolvedValue(mockAppointment);

        const dtoWithSulfonamide: CreateClinicHistoryDto = {
          appointmentId: 'appointment-uuid',
          consultationReason: 'Dolor de cabeza',
          symptoms: ['dolor', 'mareos'],
          treatment: 'Reposo',
          diagnostics: [{ name: 'Migraña', description: 'Dolor de cabeza crónico' }],
          physicalExams: [{ name: 'Examen neurológico', description: 'Normal' }],
          vitalSigns: [
            {
              name: 'Presión arterial',
              value: '120/80',
              unit: 'mmHg',
              measurement: 'sistólica/diastólica',
            },
          ],
          prescription: {
            name: 'Receta para infección',
            description: 'Antibiótico',
            medications: [
              {
                name: 'Sulfametoxazol-Trimetroprim',
                quantity: 20,
                unit: 'tabletas',
                frequency: 'Cada 12 horas',
                duration: '10 días',
                indications: 'Tomar con alimentos',
                administrationRoute: 'Oral',
              },
            ],
          },
        };

        // "sulfa" is a substring of "Sulfametoxazol" → should block
        await expect(
          service.create(dtoWithSulfonamide, 'doctor-uuid'),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});
