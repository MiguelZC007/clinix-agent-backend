import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClinicHistoryService } from './clinic-history.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from 'src/prisma/__mocks__/prisma.service.mock';
import { CreateClinicHistoryDto } from './dto/create-clinic-history.dto';

describe('ClinicHistoryService', () => {
  let service: ClinicHistoryService;
  let prisma: MockPrismaService;

  const mockPatient = {
    id: 'patient-uuid',
    user: { name: 'Juan', lastName: 'Pérez' },
  };

  const mockDoctor = {
    id: 'doctor-uuid',
    user: { name: 'María', lastName: 'González' },
    specialty: { name: 'Cardiología' },
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
