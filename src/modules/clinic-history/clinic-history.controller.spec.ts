import { Test, TestingModule } from '@nestjs/testing';
import {
  ClinicHistoryController,
  PatientClinicHistoriesController,
} from './clinic-history.controller';
import { ClinicHistoryService, ClinicHistoryListResultDto } from './clinic-history.service';
import { CreateClinicHistoryDto } from './dto/create-clinic-history.dto';
import { FindAllClinicHistoriesQueryDto } from './dto/find-all-clinic-histories-query.dto';
import { ClinicHistoryResponseDto } from './dto/clinic-history-response.dto';

describe('ClinicHistoryController', () => {
  let controller: ClinicHistoryController;
  let patientClinicHistoriesController: PatientClinicHistoriesController;
  type MockClinicHistoryService = {
    create: jest.MockedFunction<
      (
        this: void,
        dto: CreateClinicHistoryDto,
      ) => Promise<ClinicHistoryResponseDto>
    >;
    findAll: jest.MockedFunction<
      (
        this: void,
        query: FindAllClinicHistoriesQueryDto,
      ) => Promise<ClinicHistoryListResultDto>
    >;
    findOne: jest.MockedFunction<
      (this: void, id: string) => Promise<ClinicHistoryResponseDto>
    >;
    findByPatient: jest.MockedFunction<
      (this: void, patientId: string) => Promise<ClinicHistoryResponseDto[]>
    >;
  };

  let service: MockClinicHistoryService;

  const mockClinicHistoryResponse: ClinicHistoryResponseDto = {
    id: 'clinic-history-uuid',
    patientId: 'patient-uuid',
    doctorId: 'doctor-uuid',
    specialtyId: 'specialty-uuid',
    appointmentId: 'appointment-uuid',
    consultationReason: 'Dolor de cabeza',
    symptoms: ['dolor', 'mareos'],
    treatment: 'Reposo y medicación',
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
        createdAt: new Date(),
      },
    ],
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
    const mockService: MockClinicHistoryService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByPatient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClinicHistoryController, PatientClinicHistoriesController],
      providers: [{ provide: ClinicHistoryService, useValue: mockService }],
    }).compile();

    controller = module.get<ClinicHistoryController>(ClinicHistoryController);
    patientClinicHistoriesController =
      module.get<PatientClinicHistoriesController>(
        PatientClinicHistoriesController,
      );
    service = module.get(ClinicHistoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe llamar a clinicHistoryService.create con el DTO', async () => {
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

      service.create.mockResolvedValue(mockClinicHistoryResponse);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockClinicHistoryResponse);
    });
  });

  describe('findAll', () => {
    it('debe llamar a clinicHistoryService.findAll con query y retornar forma paginada', async () => {
      const query: FindAllClinicHistoriesQueryDto = { page: 1, pageSize: 10 };
      const paginated: ClinicHistoryListResultDto = {
        items: [mockClinicHistoryResponse],
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(paginated);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginated);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('debe llamar a clinicHistoryService.findOne con el ID', async () => {
      service.findOne.mockResolvedValue(mockClinicHistoryResponse);

      const result = await controller.findOne('clinic-history-uuid');

      expect(service.findOne).toHaveBeenCalledWith('clinic-history-uuid');
      expect(result).toEqual(mockClinicHistoryResponse);
    });
  });

  describe('PatientClinicHistoriesController.findByPatient', () => {
    it('debe llamar a clinicHistoryService.findByPatient con el patientId', async () => {
      service.findByPatient.mockResolvedValue([mockClinicHistoryResponse]);

      const result =
        await patientClinicHistoriesController.findByPatient('patient-uuid');

      expect(service.findByPatient).toHaveBeenCalledWith('patient-uuid');
      expect(result).toHaveLength(1);
    });
  });
});
