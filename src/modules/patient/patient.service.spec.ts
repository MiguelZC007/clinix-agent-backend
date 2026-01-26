import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from 'src/prisma/__mocks__/prisma.service.mock';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdatePatientAntecedentsDto } from './dto/update-patient-antecedents.dto';
import { Gender } from 'src/core/enum/gender.enum';

describe('PatientService', () => {
  let service: PatientService;
  let prisma: MockPrismaService;

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    name: 'Juan',
    lastName: 'Pérez',
    phone: '+584241234567',
    password: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPatient = {
    id: 'patient-uuid',
    userId: 'user-uuid',
    gender: 'male',
    birthDate: new Date('1990-05-15'),
    address: 'Calle 123',
    allergies: ['penicilina'],
    medications: ['aspirina'],
    medicalHistory: ['diabetes'],
    familyHistory: ['hipertensión'],
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PatientService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PatientService>(PatientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreatePatientDto = {
      email: 'test@example.com',
      name: 'Juan',
      lastName: 'Pérez',
      phone: '+584241234567',
      password: 'password123',
      address: 'Calle 123',
      gender: Gender.MALE,
      birthDate: '1990-05-15',
    };

    it('debe crear un paciente exitosamente', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        patient: mockPatient,
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createDto.email);
      expect(prisma.user.findFirst).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el email ya existe', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('debe retornar lista de pacientes', async () => {
      prisma.user.findMany.mockResolvedValue([
        { ...mockUser, patient: mockPatient },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it('debe retornar lista vacía si no hay pacientes', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('debe retornar un paciente por ID', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);

      const result = await service.findOne('patient-uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('patient-uuid');
    });

    it('debe lanzar NotFoundException si el paciente no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdatePatientDto = {
      name: 'Juan Carlos',
      address: 'Calle 456',
    };

    it('debe actualizar un paciente exitosamente', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.patient.update.mockResolvedValue({
        ...mockPatient,
        address: 'Calle 456',
        user: { ...mockUser, name: 'Juan Carlos' },
      });

      const result = await service.update('patient-uuid', updateDto);

      expect(result.name).toBe('Juan Carlos');
    });

    it('debe lanzar NotFoundException si el paciente no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.update('invalid-uuid', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ConflictException si el email ya está en uso', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.user.findFirst.mockResolvedValue({ id: 'other-user' });

      await expect(
        service.update('patient-uuid', { email: 'other@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('debe eliminar un paciente exitosamente', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.$transaction.mockResolvedValue(undefined);

      await expect(service.remove('patient-uuid')).resolves.toBeUndefined();
    });

    it('debe lanzar NotFoundException si el paciente no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.remove('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAntecedents', () => {
    it('debe retornar los antecedentes del paciente', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);

      const result = await service.getAntecedents('patient-uuid');

      expect(result.allergies).toEqual(['penicilina']);
      expect(result.medications).toEqual(['aspirina']);
    });

    it('debe lanzar NotFoundException si el paciente no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.getAntecedents('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAntecedents', () => {
    const updateAntecedentsDto: UpdatePatientAntecedentsDto = {
      allergies: ['penicilina', 'sulfas'],
    };

    it('debe actualizar los antecedentes exitosamente', async () => {
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.patient.update.mockResolvedValue({
        ...mockPatient,
        allergies: ['penicilina', 'sulfas'],
      });

      const result = await service.updateAntecedents(
        'patient-uuid',
        updateAntecedentsDto,
      );

      expect(result.allergies).toEqual(['penicilina', 'sulfas']);
    });

    it('debe lanzar NotFoundException si el paciente no existe', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAntecedents('invalid-uuid', updateAntecedentsDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
