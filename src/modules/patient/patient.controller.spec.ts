import { Test, TestingModule } from '@nestjs/testing';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdatePatientAntecedentsDto } from './dto/update-patient-antecedents.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import { PatientAntecedentsDto } from './dto/patient-antecedents.dto';
import { Gender } from 'src/core/enum/gender.enum';

describe('PatientController', () => {
  let controller: PatientController;
  let service: jest.Mocked<PatientService>;

  const mockPatientResponse: PatientResponseDto = {
    id: 'patient-uuid',
    email: 'test@example.com',
    name: 'Juan',
    lastName: 'Pérez',
    phone: '+584241234567',
    address: 'Calle 123',
    gender: Gender.MALE,
    birthDate: new Date('1990-05-15'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAntecedents: PatientAntecedentsDto = {
    patientId: 'patient-uuid',
    allergies: ['penicilina'],
    medications: ['aspirina'],
    medicalHistory: ['diabetes'],
    familyHistory: ['hipertensión'],
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getAntecedents: jest.fn(),
      updateAntecedents: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientController],
      providers: [{ provide: PatientService, useValue: mockService }],
    }).compile();

    controller = module.get<PatientController>(PatientController);
    service = module.get(PatientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe llamar a patientService.create con el DTO correcto', async () => {
      const createDto: CreatePatientDto = {
        email: 'test@example.com',
        name: 'Juan',
        lastName: 'Pérez',
        phone: '+584241234567',
        address: 'Calle 123',
        gender: Gender.MALE,
      };

      service.create.mockResolvedValue(mockPatientResponse);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockPatientResponse);
    });
  });

  describe('findAll', () => {
    it('debe llamar a patientService.findAll', async () => {
      service.findAll.mockResolvedValue([mockPatientResponse]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('debe llamar a patientService.findOne con el ID', async () => {
      service.findOne.mockResolvedValue(mockPatientResponse);

      const result = await controller.findOne('patient-uuid');

      expect(service.findOne).toHaveBeenCalledWith('patient-uuid');
      expect(result).toEqual(mockPatientResponse);
    });
  });

  describe('update', () => {
    it('debe llamar a patientService.update con ID y DTO', async () => {
      const updateDto: UpdatePatientDto = { name: 'Juan Carlos' };
      service.update.mockResolvedValue({
        ...mockPatientResponse,
        name: 'Juan Carlos',
      });

      const result = await controller.update('patient-uuid', updateDto);

      expect(service.update).toHaveBeenCalledWith('patient-uuid', updateDto);
      expect(result.name).toBe('Juan Carlos');
    });
  });

  describe('remove', () => {
    it('debe llamar a patientService.remove con el ID', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('patient-uuid');

      expect(service.remove).toHaveBeenCalledWith('patient-uuid');
    });
  });

  describe('getAntecedents', () => {
    it('debe llamar a patientService.getAntecedents con el ID', async () => {
      service.getAntecedents.mockResolvedValue(mockAntecedents);

      const result = await controller.getAntecedents('patient-uuid');

      expect(service.getAntecedents).toHaveBeenCalledWith('patient-uuid');
      expect(result).toEqual(mockAntecedents);
    });
  });

  describe('updateAntecedents', () => {
    it('debe llamar a patientService.updateAntecedents con ID y DTO', async () => {
      const updateDto: UpdatePatientAntecedentsDto = {
        allergies: ['penicilina', 'sulfas'],
      };
      service.updateAntecedents.mockResolvedValue({
        ...mockAntecedents,
        allergies: ['penicilina', 'sulfas'],
      });

      const result = await controller.updateAntecedents('patient-uuid', updateDto);

      expect(service.updateAntecedents).toHaveBeenCalledWith(
        'patient-uuid',
        updateDto,
      );
      expect(result.allergies).toEqual(['penicilina', 'sulfas']);
    });
  });
});
