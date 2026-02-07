import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClinicHistoryService } from './clinic-history.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from 'src/prisma/__mocks__/prisma.service.mock';
import { CreateClinicHistoryDto } from './dto/create-clinic-history.dto';
import { CreateClinicHistoryWithoutAppointmentDto } from './dto/create-clinic-history-without-appointment.dto';

describe('ClinicHistoryService', () => {
  let service: ClinicHistoryService;
  let prisma: MockPrismaService;

  const mockPatient = {
    id: 'patient-uuid',
    patientNumber: 1,
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
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      prisma.clinicHistory.create.mockResolvedValue(mockClinicHistory);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.consultationReason).toBe('Dolor de cabeza');
    });

    it('debe lanzar NotFoundException si la cita no existe', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ConflictException si la cita ya tiene historia clínica', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        clinicHistory: mockClinicHistory,
      });

      await expect(service.create(createDto)).rejects.toThrow(
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
        physicalExams: [
          { name: 'Examen neurológico', description: 'Normal' },
        ],
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

    it('debe crear una historia clínica sin cita exitosamente', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
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
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
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
        physicalExams: [
          { name: 'Examen neurológico', description: 'Normal' },
        ],
        vitalSigns: [
          {
            name: 'Presión arterial',
            value: '120/80',
            unit: 'mmHg',
            measurement: 'sistólica/diastólica',
          },
        ],
      };
      const patientByNumber = { ...mockPatient, id: 'patient-uuid' };
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
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
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
    it('debe retornar lista paginada de historias clínicas', async () => {
      prisma.$transaction.mockImplementation((args: unknown[]) =>
        Promise.all(args as Promise<unknown>[]),
      );
      prisma.clinicHistory.findMany.mockResolvedValue([mockClinicHistory]);
      prisma.clinicHistory.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, pageSize: 10 });

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
      expect(prisma.clinicHistory.count).toHaveBeenCalledWith({ where: {} });
    });
  });

  describe('findOne', () => {
    it('debe retornar una historia clínica por ID', async () => {
      prisma.clinicHistory.findUnique.mockResolvedValue(mockClinicHistory);

      const result = await service.findOne('clinic-history-uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('clinic-history-uuid');
    });

    it('debe retornar appointmentId null cuando la historia no tiene cita asociada', async () => {
      const withoutAppointment = {
        ...mockClinicHistory,
        appointmentId: null,
      };
      prisma.clinicHistory.findUnique.mockResolvedValue(withoutAppointment);

      const result = await service.findOne('clinic-history-uuid');

      expect(result).toBeDefined();
      expect(result.appointmentId).toBeNull();
    });

    it('debe lanzar NotFoundException si la historia no existe', async () => {
      prisma.clinicHistory.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByPatient', () => {
    it('debe retornar historias clínicas de un paciente', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.clinicHistory.findMany.mockResolvedValue([mockClinicHistory]);

      const result = await service.findByPatient('patient-uuid');

      expect(result).toHaveLength(1);
    });

    it('debe lanzar NotFoundException si el paciente no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.findByPatient('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
