import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
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

  const mockSpecialty = {
    id: 'specialty-uuid',
    name: 'Cardiología',
    specialtyCode: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDoctor = {
    id: 'doctor-uuid',
    userId: 'user-uuid',
    specialtyId: 'specialty-uuid',
    licenseNumber: 'LIC-12345',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
    specialty: mockSpecialty,
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateDoctorDto = {
      email: 'doctor@ejemplo.com',
      name: 'Carlos',
      lastName: 'García',
      phone: '+584241234567',
      password: 'password123',
      specialtyId: 'specialty-uuid',
      licenseNumber: 'LIC-12345',
    };

    it('debe crear un doctor exitosamente (transacción User+Doctor+AuditLog)', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            user: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({
                ...mockUser,
                doctor: { ...mockDoctor, specialty: mockSpecialty },
              }),
            },
            doctor: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            specialty: {
              findUnique: jest.fn().mockResolvedValue(mockSpecialty),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(tx);
        },
      );

      const result = await service.create(createDto, 'admin-uuid');

      expect(result).toBeDefined();
      expect(result.email).toBe(createDto.email);
      expect(result.licenseNumber).toBe(createDto.licenseNumber);
      expect(result.specialtyName).toBe('Cardiología');
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
              findFirst: jest.fn(),
            },
            specialty: {
              findUnique: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
          };
          return callback(tx);
        },
      );

      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe lanzar ConflictException si el teléfono ya existe', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            user: {
              findFirst: jest.fn().mockResolvedValue(mockUser),
              create: jest.fn(),
            },
            doctor: {
              findFirst: jest.fn(),
            },
            specialty: {
              findUnique: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
          };
          return callback(tx);
        },
      );

      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe lanzar ConflictException si el licenseNumber ya existe', async () => {
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
              findUnique: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
          };
          return callback(tx);
        },
      );

      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe lanzar NotFoundException si el specialtyId no existe', async () => {
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
            auditLog: {
              create: jest.fn(),
            },
          };
          return callback(tx);
        },
      );

      await expect(service.create(createDto, 'admin-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe hashear la password antes de crear', async () => {
      const bcrypt = require('bcrypt');

      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            user: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({
                ...mockUser,
                doctor: { ...mockDoctor, specialty: mockSpecialty },
              }),
            },
            doctor: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            specialty: {
              findUnique: jest.fn().mockResolvedValue(mockSpecialty),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(tx);
        },
      );

      await service.create(createDto, 'admin-uuid');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', expect.any(Number));
    });
  });

  describe('findAll', () => {
    it('debe retornar lista paginada', async () => {
      prisma.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      );
      prisma.doctor.findMany.mockResolvedValue([mockDoctor]);
      prisma.doctor.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('debe filtrar por búsqueda (name, email, phone, licenseNumber)', async () => {
      prisma.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      );
      prisma.doctor.findMany.mockResolvedValue([mockDoctor]);
      prisma.doctor.count.mockResolvedValue(1);

      const result = await service.findAll({ search: 'Carlos' });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.doctor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: expect.objectContaining({
              OR: expect.any(Array),
            }),
          }),
        }),
      );
    });

    it('debe respetar paginación (page, pageSize)', async () => {
      prisma.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      );
      prisma.doctor.findMany.mockResolvedValue([mockDoctor]);
      prisma.doctor.count.mockResolvedValue(25);

      const result = await service.findAll({ page: 2, pageSize: 5 });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(5);
      expect(prisma.doctor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debe retornar un doctor por ID', async () => {
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);

      const result = await service.findOne('doctor-uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('doctor-uuid');
      expect(result.specialtyName).toBe('Cardiología');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateDoctorDto = {
      name: 'Carlos Alberto',
      licenseNumber: 'LIC-99999',
    };

    it('debe actualizar los datos del doctor', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            doctor: {
              findUnique: jest.fn().mockResolvedValue({
                ...mockDoctor,
                user: mockUser,
                specialty: mockSpecialty,
              }),
              findFirst: jest.fn().mockResolvedValue(null),
              update: jest.fn().mockResolvedValue({}),
            },
            user: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            specialty: {
              findUnique: jest.fn().mockResolvedValue(mockSpecialty),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
            },
          };
          return callback(tx);
        },
      );
      prisma.doctor.findUnique.mockResolvedValue({
        ...mockDoctor,
        user: { ...mockUser, name: 'Carlos Alberto' },
        specialty: mockSpecialty,
        licenseNumber: 'LIC-99999',
      });

      const result = await service.update('doctor-uuid', updateDto, 'admin-uuid');

      expect(result).toBeDefined();
    });

    it('debe lanzar ConflictException si el email está duplicado (otro doctor)', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            doctor: {
              findUnique: jest.fn().mockResolvedValue({
                ...mockDoctor,
                user: mockUser,
                specialty: mockSpecialty,
              }),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findFirst: jest.fn().mockResolvedValue({ id: 'other-user' }),
            },
            specialty: {
              findUnique: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
          };
          return callback(tx);
        },
      );

      await expect(
        service.update('doctor-uuid', { email: 'otro@ejemplo.com' }, 'admin-uuid'),
      ).rejects.toThrow(ConflictException);
    });

    it('debe lanzar ConflictException si el licenseNumber está duplicado (otro doctor)', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            doctor: {
              findUnique: jest.fn().mockResolvedValue({
                ...mockDoctor,
                user: mockUser,
                specialty: mockSpecialty,
              }),
              findFirst: jest.fn().mockResolvedValue({ id: 'other-doctor' }),
              update: jest.fn(),
            },
            user: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            specialty: {
              findUnique: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
          };
          return callback(tx);
        },
      );

      await expect(
        service.update('doctor-uuid', { licenseNumber: 'LIC-EXISTE' }, 'admin-uuid'),
      ).rejects.toThrow(ConflictException);
    });

    it('debe lanzar NotFoundException si el specialtyId no existe', async () => {
      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            doctor: {
              findUnique: jest.fn().mockResolvedValue({
                ...mockDoctor,
                user: mockUser,
                specialty: mockSpecialty,
              }),
              findFirst: jest.fn().mockResolvedValue(null),
              update: jest.fn(),
            },
            user: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            specialty: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
            auditLog: {
              create: jest.fn(),
            },
          };
          return callback(tx);
        },
      );

      await expect(
        service.update('doctor-uuid', { specialtyId: 'no-existe' }, 'admin-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe escribir audit log con diff { before, after }', async () => {
      let capturedAuditData: unknown;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            doctor: {
              findUnique: jest.fn().mockResolvedValue({
                ...mockDoctor,
                user: mockUser,
                specialty: mockSpecialty,
              }),
              findFirst: jest.fn().mockResolvedValue(null),
              update: jest.fn().mockResolvedValue({}),
            },
            user: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            specialty: {
              findUnique: jest.fn().mockResolvedValue(mockSpecialty),
            },
            auditLog: {
              create: jest.fn().mockImplementation((args: { data: unknown }) => {
                capturedAuditData = args.data;
                return Promise.resolve({});
              }),
            },
          };
          return callback(tx);
        },
      );
      prisma.doctor.findUnique.mockResolvedValue({
        ...mockDoctor,
        user: { ...mockUser, name: 'Carlos Alberto' },
        specialty: mockSpecialty,
        licenseNumber: 'LIC-99999',
      });

      await service.update('doctor-uuid', updateDto, 'admin-uuid');

      expect(capturedAuditData).toBeDefined();
      expect(capturedAuditData).toEqual(
        expect.objectContaining({
          entityType: 'Doctor',
          entityId: 'doctor-uuid',
          action: 'UPDATE',
          adminId: 'admin-uuid',
          before: expect.objectContaining({
            name: 'Carlos',
            licenseNumber: 'LIC-12345',
          }),
          after: expect.any(Object),
        }),
      );
    });
  });

  describe('disable', () => {
    it('debe setear isActive=false', async () => {
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.$transaction.mockResolvedValue([null, null] as never);

      const result = await service.disable('doctor-uuid', 'admin-uuid');

      expect(result.isActive).toBe(false);
    });

    it('debe escribir audit log con acción DISABLE', async () => {
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.$transaction.mockResolvedValue([null, null] as never);

      await service.disable('doctor-uuid', 'admin-uuid');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.disable('invalid-uuid', 'admin-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('enable', () => {
    it('debe setear isActive=true', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        ...mockDoctor,
        isActive: false,
      });
      prisma.$transaction.mockResolvedValue([null, null] as never);

      const result = await service.enable('doctor-uuid', 'admin-uuid');

      expect(result.isActive).toBe(true);
    });

    it('debe escribir audit log con acción ENABLE', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        ...mockDoctor,
        isActive: false,
      });
      prisma.$transaction.mockResolvedValue([null, null] as never);

      await service.enable('doctor-uuid', 'admin-uuid');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.enable('invalid-uuid', 'admin-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
