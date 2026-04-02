import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from 'src/prisma/__mocks__/prisma.service.mock';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('AdminService', () => {
  let service: AdminService;
  let prisma: MockPrismaService;
  let auditService: jest.Mocked<AuditService>;

  const mockUser = {
    id: 'user-uuid',
    email: 'doctor@ejemplo.com',
    name: 'Carlos',
    lastName: 'García',
    phone: '+584241234567',
    password: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDoctor = {
    id: 'doctor-uuid',
    userId: 'user-uuid',
    specialtyId: 'specialty-uuid',
    licenseNumber: 'MP-12345',
    isActive: true,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    user: mockUser,
    specialty: {
      id: 'specialty-uuid',
      name: 'Cardiología',
      specialtyCode: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const mockAuditService = {
      log: jest.fn().mockResolvedValue({
        id: 'audit-uuid',
        userId: 'admin-uuid',
        userName: 'Admin Test',
        action: 'CREATE',
        entityType: 'Doctor',
        entityId: 'doctor-uuid',
        previousState: null,
        newState: {},
        result: 'SUCCESS',
        errorMessage: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      }),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDoctor()', () => {
    const createDto: CreateDoctorDto = {
      email: 'doctor@ejemplo.com',
      name: 'Carlos',
      lastName: 'García',
      phone: '+584241234567',
      password: 'password123',
      specialtyId: 'specialty-uuid',
      licenseNumber: 'MP-12345',
    };

    it('debe crear un doctor exitosamente', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            user: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({
                ...mockUser,
                doctor: {
                  ...mockDoctor,
                  specialty: {
                    id: 'specialty-uuid',
                    name: 'Cardiología',
                  },
                },
              }),
            },
            doctor: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            specialty: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'specialty-uuid',
                name: 'Cardiología',
              }),
            },
          };
          return callback(tx);
        },
      );

      const result = await service.createDoctor(createDto, 'admin-uuid');

      expect(result).toBeDefined();
      expect(result.email).toBe(createDto.email);
      expect(result.licenseNumber).toBe(createDto.licenseNumber);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-uuid',
          action: 'CREATE',
          entityType: 'Doctor',
          result: 'SUCCESS',
        }),
      );
    });

    it('debe lanzar ConflictException si el email ya existe', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            user: {
              findFirst: jest.fn().mockResolvedValue(mockUser),
              create: jest.fn(),
            },
            doctor: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            specialty: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'specialty-uuid',
              }),
            },
          };
          return callback(tx);
        },
      );

      await expect(
        service.createDoctor(createDto, 'admin-uuid'),
      ).rejects.toThrow(ConflictException);
    });

    it('debe lanzar ConflictException si el número de licencia ya existe', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            user: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn(),
            },
            doctor: {
              findFirst: jest.fn().mockResolvedValue(mockDoctor),
            },
            specialty: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'specialty-uuid',
              }),
            },
          };
          return callback(tx);
        },
      );

      await expect(
        service.createDoctor(createDto, 'admin-uuid'),
      ).rejects.toThrow(ConflictException);
    });

    it('debe lanzar NotFoundException si la especialidad no existe', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            user: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn(),
            },
            doctor: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            specialty: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
          };
          return callback(tx);
        },
      );

      await expect(
        service.createDoctor(createDto, 'admin-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllDoctors()', () => {
    it('debe retornar lista paginada de doctores', async () => {
      prisma.doctor.findMany.mockResolvedValue([mockDoctor]);
      prisma.doctor.count.mockResolvedValue(1);

      const result = await service.findAllDoctors({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('debe aplicar filtro de búsqueda', async () => {
      prisma.doctor.findMany.mockResolvedValue([]);
      prisma.doctor.count.mockResolvedValue(0);

      await service.findAllDoctors({ search: 'Carlos' });

      expect(prisma.doctor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: {
              OR: [
                { name: { contains: 'Carlos', mode: 'insensitive' } },
                { lastName: { contains: 'Carlos', mode: 'insensitive' } },
                { email: { contains: 'Carlos', mode: 'insensitive' } },
              ],
            },
          }),
        }),
      );
    });

    it('debe aplicar filtro isActive', async () => {
      prisma.doctor.findMany.mockResolvedValue([]);
      prisma.doctor.count.mockResolvedValue(0);

      await service.findAllDoctors({ isActive: true });

      expect(prisma.doctor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('findOneDoctor()', () => {
    it('debe retornar un doctor por ID', async () => {
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);

      const result = await service.findOneDoctor('doctor-uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('doctor-uuid');
      expect(result.licenseNumber).toBe('MP-12345');
    });

    it('debe lanzar NotFoundException si el doctor no existe', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.findOneDoctor('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateDoctor()', () => {
    it('debe actualizar un doctor exitosamente', async () => {
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.specialty.findUnique.mockResolvedValue({
        id: 'specialty-uuid',
        name: 'Cardiología',
      });
      prisma.doctor.findFirst.mockResolvedValue(null);
      prisma.doctor.update.mockResolvedValue({
        ...mockDoctor,
        licenseNumber: 'MP-99999',
      });

      const dto: UpdateDoctorDto = { licenseNumber: 'MP-99999' };
      const result = await service.updateDoctor('doctor-uuid', dto, 'admin-uuid');

      expect(result).toBeDefined();
      expect(prisma.doctor.update).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entityType: 'Doctor',
          entityId: 'doctor-uuid',
          result: 'SUCCESS',
        }),
      );
    });

    it('debe lanzar NotFoundException si el doctor no existe', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.updateDoctor('non-existent', {}, 'admin-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ConflictException si la licencia está duplicada', async () => {
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.doctor.findFirst.mockResolvedValue({
        ...mockDoctor,
        id: 'other-doctor-uuid',
      });

      const dto: UpdateDoctorDto = { licenseNumber: 'MP-DUPLICATE' };
      await expect(
        service.updateDoctor('doctor-uuid', dto, 'admin-uuid'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivateDoctor()', () => {
    it('debe desactivar un doctor exitosamente', async () => {
      prisma.doctor.findUnique
        .mockResolvedValueOnce(mockDoctor)
        .mockResolvedValueOnce({ ...mockDoctor, isActive: false });
      prisma.doctor.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.deactivateDoctor('doctor-uuid', 'admin-uuid');

      expect(result.isActive).toBe(false);
      expect(prisma.doctor.updateMany).toHaveBeenCalledWith({
        where: { id: 'doctor-uuid', isActive: true },
        data: { isActive: false },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DEACTIVATE',
          entityType: 'Doctor',
          entityId: 'doctor-uuid',
          result: 'SUCCESS',
        }),
      );
    });

    it('debe lanzar ConflictException si ya está inactivo', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        ...mockDoctor,
        isActive: false,
      });
      prisma.doctor.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.deactivateDoctor('doctor-uuid', 'admin-uuid'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('activateDoctor()', () => {
    it('debe reactivar un doctor exitosamente', async () => {
      prisma.doctor.findUnique
        .mockResolvedValueOnce({ ...mockDoctor, isActive: false })
        .mockResolvedValueOnce(mockDoctor);
      prisma.doctor.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.activateDoctor('doctor-uuid', 'admin-uuid');

      expect(result.isActive).toBe(true);
      expect(prisma.doctor.updateMany).toHaveBeenCalledWith({
        where: { id: 'doctor-uuid', isActive: false },
        data: { isActive: true },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACTIVATE',
          entityType: 'Doctor',
          entityId: 'doctor-uuid',
          result: 'SUCCESS',
        }),
      );
    });

    it('debe lanzar ConflictException si ya está activo', async () => {
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.doctor.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.activateDoctor('doctor-uuid', 'admin-uuid'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
