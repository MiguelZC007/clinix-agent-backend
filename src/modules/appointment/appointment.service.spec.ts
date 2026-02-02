import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from 'src/prisma/__mocks__/prisma.service.mock';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { StatusAppointment } from 'src/core/enum/statusAppointment.enum';

describe('AppointmentService', () => {
  let service: AppointmentService;
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

  const mockSpecialty = {
    id: 'specialty-uuid',
    name: 'Cardiología',
  };

  const mockAppointment = {
    id: 'appointment-uuid',
    patientId: 'patient-uuid',
    doctorId: 'doctor-uuid',
    specialtyId: 'specialty-uuid',
    reason: 'Consulta de control',
    startAppointment: new Date('2026-01-20T09:00:00.000Z'),
    endAppointment: new Date('2026-01-20T09:30:00.000Z'),
    status: StatusAppointment.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: mockPatient,
    doctor: mockDoctor,
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateAppointmentDto = {
      patientId: 'patient-uuid',
      doctorId: 'doctor-uuid',
      specialtyId: 'specialty-uuid',
      startAppointment: '2026-01-20T09:00:00.000Z',
      endAppointment: '2026-01-20T09:30:00.000Z',
      reason: 'Consulta de control',
    };

    it('debe crear una cita exitosamente', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.specialty.findUnique.mockResolvedValue(mockSpecialty);
      prisma.appointment.findFirst.mockResolvedValue(null);
      prisma.appointment.create.mockResolvedValue(mockAppointment);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(StatusAppointment.PENDING);
    });

    it('debe lanzar NotFoundException si el paciente no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar NotFoundException si el doctor no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar NotFoundException si la especialidad no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.specialty.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar BadRequestException si fecha inicio >= fecha fin', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.specialty.findUnique.mockResolvedValue(mockSpecialty);

      const invalidDto = {
        ...createDto,
        startAppointment: '2026-01-20T10:00:00.000Z',
        endAppointment: '2026-01-20T09:00:00.000Z',
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar ConflictException si hay conflicto de horario', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.specialty.findUnique.mockResolvedValue(mockSpecialty);
      prisma.appointment.findFirst.mockResolvedValue(mockAppointment);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('debe retornar lista de citas paginada', async () => {
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);
      prisma.appointment.count.mockResolvedValue(1);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(prisma.appointment.findMany).toHaveBeenCalled();
      expect(prisma.appointment.count).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('debe retornar una cita por ID', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const result = await service.findOne('appointment-uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('appointment-uuid');
    });

    it('debe lanzar NotFoundException si la cita no existe', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateAppointmentDto = {
      status: StatusAppointment.CONFIRMED,
      reason: 'Motivo actualizado',
    };

    it('debe actualizar una cita exitosamente', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      prisma.appointment.update.mockResolvedValue({
        ...mockAppointment,
        status: StatusAppointment.CONFIRMED,
        reason: 'Motivo actualizado',
      });

      const result = await service.update('appointment-uuid', updateDto);

      expect(result.status).toBe(StatusAppointment.CONFIRMED);
      expect(result.reason).toBe('Motivo actualizado');
    });

    it('debe lanzar NotFoundException si la cita no existe', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-uuid', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('debe cancelar una cita exitosamente', async () => {
      prisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      prisma.appointment.update.mockResolvedValue({
        ...mockAppointment,
        status: StatusAppointment.CANCELLED,
      });

      const result = await service.cancel('appointment-uuid');

      expect(result.status).toBe(StatusAppointment.CANCELLED);
    });

    it('debe lanzar NotFoundException si la cita no existe', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.cancel('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar BadRequestException si la cita ya está cancelada', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        status: StatusAppointment.CANCELLED,
      });

      await expect(service.cancel('appointment-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar BadRequestException si la cita está completada', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        ...mockAppointment,
        status: StatusAppointment.COMPLETED,
      });

      await expect(service.cancel('appointment-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByPatient', () => {
    it('debe retornar citas de un paciente', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);

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

  describe('findTodaysByDoctor', () => {
    it('debe retornar lista vacía cuando no hay citas', async () => {
      prisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.findTodaysByDoctor('doctor-uuid');

      expect(result).toHaveLength(0);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ doctorId: 'doctor-uuid' }),
        }),
      );
    });

    it('debe retornar citas del día para el doctor', async () => {
      prisma.appointment.findMany.mockResolvedValue([mockAppointment]);

      const result = await service.findTodaysByDoctor('doctor-uuid');

      expect(result).toHaveLength(1);
    });

    it('debe aceptar fecha opcional', async () => {
      prisma.appointment.findMany.mockResolvedValue([]);

      await service.findTodaysByDoctor('doctor-uuid', '2026-02-01');

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: 'doctor-uuid',
            startAppointment: expect.any(Object),
          }),
        }),
      );
    });
  });
});
