import { Test, TestingModule } from '@nestjs/testing';
import {
  AppointmentController,
  PatientAppointmentsController,
} from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { StatusAppointment } from 'src/core/enum/statusAppointment.enum';

describe('AppointmentController', () => {
  let controller: AppointmentController;
  let patientAppointmentsController: PatientAppointmentsController;
  let service: jest.Mocked<AppointmentService>;

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
    const mockService = {
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
    it('debe llamar a appointmentService.create con el DTO', async () => {
      const createDto: CreateAppointmentDto = {
        patientId: 'patient-uuid',
        doctorId: 'doctor-uuid',
        specialtyId: 'specialty-uuid',
        startAppointment: '2026-01-20T09:00:00.000Z',
        endAppointment: '2026-01-20T09:30:00.000Z',
      reason: 'Consulta de control',
      };

      service.create.mockResolvedValue(mockAppointmentResponse);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockAppointmentResponse);
    });
  });

  describe('findAll', () => {
    it('debe llamar a appointmentService.findAll', async () => {
      service.findAll.mockResolvedValue([mockAppointmentResponse]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('debe llamar a appointmentService.findOne con el ID', async () => {
      service.findOne.mockResolvedValue(mockAppointmentResponse);

      const result = await controller.findOne('appointment-uuid');

      expect(service.findOne).toHaveBeenCalledWith('appointment-uuid');
      expect(result).toEqual(mockAppointmentResponse);
    });
  });

  describe('update', () => {
    it('debe llamar a appointmentService.update con ID y DTO', async () => {
      const updateDto: UpdateAppointmentDto = {
        status: StatusAppointment.CONFIRMED,
        reason: 'Motivo actualizado',
      };
      service.update.mockResolvedValue({
        ...mockAppointmentResponse,
        status: StatusAppointment.CONFIRMED,
        reason: 'Motivo actualizado',
      });

      const result = await controller.update('appointment-uuid', updateDto);

      expect(service.update).toHaveBeenCalledWith('appointment-uuid', updateDto);
      expect(result.status).toBe(StatusAppointment.CONFIRMED);
    });
  });

  describe('cancel', () => {
    it('debe llamar a appointmentService.cancel con el ID', async () => {
      service.cancel.mockResolvedValue({
        ...mockAppointmentResponse,
        status: StatusAppointment.CANCELLED,
      });

      const result = await controller.cancel('appointment-uuid');

      expect(service.cancel).toHaveBeenCalledWith('appointment-uuid');
      expect(result.status).toBe(StatusAppointment.CANCELLED);
    });
  });

  describe('PatientAppointmentsController.findByPatient', () => {
    it('debe llamar a appointmentService.findByPatient con el patientId', async () => {
      service.findByPatient.mockResolvedValue([mockAppointmentResponse]);

      const result =
        await patientAppointmentsController.findByPatient('patient-uuid');

      expect(service.findByPatient).toHaveBeenCalledWith('patient-uuid');
      expect(result).toHaveLength(1);
    });
  });
});
