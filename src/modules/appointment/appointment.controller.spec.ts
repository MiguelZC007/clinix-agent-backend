import { Test, TestingModule } from '@nestjs/testing';
import {
  AppointmentController,
  PatientAppointmentsController,
} from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import type { PaginationResponseDto } from 'src/core/dto/pagination-response.dto';
import { StatusAppointment } from 'src/core/enum/statusAppointment.enum';

describe('AppointmentController', () => {
  let controller: AppointmentController;
  let patientAppointmentsController: PatientAppointmentsController;

  const mockUser = { doctor: { id: 'doctor-uuid' } };

  type MockAppointmentService = {
    create: jest.MockedFunction<
      (
        this: void,
        dto: CreateAppointmentDto,
        doctorId: string,
      ) => Promise<AppointmentResponseDto>
    >;
    findAll: jest.MockedFunction<
      (
        this: void,
        doctorId: string,
        page: number,
        limit: number,
        startDate?: string,
        endDate?: string,
      ) => Promise<PaginationResponseDto<AppointmentResponseDto>>
    >;
    findOne: jest.MockedFunction<
      (
        this: void,
        id: string,
        doctorId: string,
      ) => Promise<AppointmentResponseDto>
    >;
    update: jest.MockedFunction<
      (
        this: void,
        id: string,
        dto: UpdateAppointmentDto,
        doctorId: string,
      ) => Promise<AppointmentResponseDto>
    >;
    cancel: jest.MockedFunction<
      (
        this: void,
        id: string,
        doctorId: string,
      ) => Promise<AppointmentResponseDto>
    >;
    findByPatient: jest.MockedFunction<
      (
        this: void,
        patientId: string,
        doctorId: string,
      ) => Promise<AppointmentResponseDto[]>
    >;
  };

  let service: MockAppointmentService;

  const mockAppointmentResponse: AppointmentResponseDto = {
    id: 'appointment-uuid',
    patientId: 'patient-uuid',
    doctorId: 'doctor-uuid',
    specialtyId: 'specialty-uuid',
    reason: 'Consulta de control',
    startAppointment: new Date('2026-01-20T09:00:00.000Z'),
    endAppointment: new Date('2026-01-20T09:30:00.000Z'),
    status: StatusAppointment.PENDING,
    patient: {
      id: 'patient-uuid',
      name: 'Juan',
      lastName: 'Pérez',
    },
    doctor: {
      id: 'doctor-uuid',
      name: 'María',
      lastName: 'González',
      specialty: 'Cardiología',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService: MockAppointmentService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      findByPatient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentController, PatientAppointmentsController],
      providers: [{ provide: AppointmentService, useValue: mockService }],
    }).compile();

    controller = module.get<AppointmentController>(AppointmentController);
    patientAppointmentsController = module.get<PatientAppointmentsController>(
      PatientAppointmentsController,
    );
    service = module.get(AppointmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe llamar a appointmentService.create con el DTO y doctorId del usuario', async () => {
      const createDto: CreateAppointmentDto = {
        patientId: 'patient-uuid',
        specialtyId: 'specialty-uuid',
        startAppointment: '2026-01-20T09:00:00.000Z',
        endAppointment: '2026-01-20T09:30:00.000Z',
        reason: 'Consulta de control',
      };

      service.create.mockResolvedValue(mockAppointmentResponse);

      const result = await controller.create(createDto, mockUser);

      expect(service.create).toHaveBeenCalledWith(createDto, 'doctor-uuid');
      expect(result).toEqual(mockAppointmentResponse);
    });
  });

  describe('findAll', () => {
    it('debe llamar a appointmentService.findAll con doctorId y query', async () => {
      const paginatedResponse: PaginationResponseDto<AppointmentResponseDto> = {
        data: [mockAppointmentResponse],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(paginatedResponse);

      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query, mockUser);

      expect(service.findAll).toHaveBeenCalledWith(
        'doctor-uuid',
        1,
        10,
        undefined,
        undefined,
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('debe llamar a appointmentService.findOne con el ID y doctorId', async () => {
      service.findOne.mockResolvedValue(mockAppointmentResponse);

      const result = await controller.findOne('appointment-uuid', mockUser);

      expect(service.findOne).toHaveBeenCalledWith(
        'appointment-uuid',
        'doctor-uuid',
      );
      expect(result).toEqual(mockAppointmentResponse);
    });
  });

  describe('update', () => {
    it('debe llamar a appointmentService.update con ID, DTO y doctorId', async () => {
      const updateDto: UpdateAppointmentDto = {
        status: StatusAppointment.CONFIRMED,
        reason: 'Motivo actualizado',
      };
      service.update.mockResolvedValue({
        ...mockAppointmentResponse,
        status: StatusAppointment.CONFIRMED,
        reason: 'Motivo actualizado',
      });

      const result = await controller.update(
        'appointment-uuid',
        updateDto,
        mockUser,
      );

      expect(service.update).toHaveBeenCalledWith(
        'appointment-uuid',
        updateDto,
        'doctor-uuid',
      );
      expect(result.status).toBe(StatusAppointment.CONFIRMED);
    });
  });

  describe('cancel', () => {
    it('debe llamar a appointmentService.cancel con el ID y doctorId', async () => {
      service.cancel.mockResolvedValue({
        ...mockAppointmentResponse,
        status: StatusAppointment.CANCELLED,
      });

      const result = await controller.cancel('appointment-uuid', mockUser);

      expect(service.cancel).toHaveBeenCalledWith(
        'appointment-uuid',
        'doctor-uuid',
      );
      expect(result.status).toBe(StatusAppointment.CANCELLED);
    });
  });

  describe('PatientAppointmentsController.findByPatient', () => {
    it('debe llamar a appointmentService.findByPatient con patientId y doctorId', async () => {
      service.findByPatient.mockResolvedValue([mockAppointmentResponse]);

      const result =
        await patientAppointmentsController.findByPatient(
          'patient-uuid',
          mockUser,
        );

      expect(service.findByPatient).toHaveBeenCalledWith(
        'patient-uuid',
        'doctor-uuid',
      );
      expect(result).toHaveLength(1);
    });
  });
});
