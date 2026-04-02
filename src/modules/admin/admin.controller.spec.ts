import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService, DoctorListResultDto } from './admin.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { DoctorListQueryDto } from './dto/doctor-list-query.dto';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from 'src/core/enum/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;

  const mockDoctorResponse: DoctorResponseDto = {
    id: 'doctor-uuid',
    email: 'doctor@ejemplo.com',
    name: 'Carlos',
    lastName: 'García',
    phone: '+584241234567',
    licenseNumber: 'LIC-12345',
    specialtyId: 'specialty-uuid',
    specialtyName: 'Cardiología',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockListResult: DoctorListResultDto = {
    items: [mockDoctorResponse],
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  };

  const mockUser = { id: 'admin-uuid' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockDoctorResponse),
            findAll: jest.fn().mockResolvedValue(mockListResult),
            findOne: jest.fn().mockResolvedValue(mockDoctorResponse),
            update: jest.fn().mockResolvedValue(mockDoctorResponse),
            disable: jest.fn().mockResolvedValue({ ...mockDoctorResponse, isActive: false }),
            enable: jest.fn().mockResolvedValue({ ...mockDoctorResponse, isActive: true }),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('decorator RolesGuard', () => {
    it('debe tener @UseGuards(RolesGuard) aplicado', () => {
      const guards = Reflect.getMetadata('__guards__', AdminController);
      expect(guards).toBeDefined();
      expect(guards).toContain(RolesGuard);
    });

    it('debe tener @Roles(Role.ADMIN) aplicado', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, AdminController);
      expect(roles).toBeDefined();
      expect(roles).toContain(Role.ADMIN);
    });
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

    it('debe crear un doctor y retornar DoctorResponseDto', async () => {
      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockDoctorResponse);
      expect(adminService.create).toHaveBeenCalledWith(createDto, 'admin-uuid');
    });

    it('debe retornar la estructura correcta de DoctorResponseDto', async () => {
      const result = await controller.create(createDto, mockUser);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('phone');
      expect(result).toHaveProperty('licenseNumber');
      expect(result).toHaveProperty('specialtyId');
      expect(result).toHaveProperty('specialtyName');
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('findAll', () => {
    it('debe retornar lista paginada de doctores', async () => {
      const query: DoctorListQueryDto = { page: 1, pageSize: 10 };
      const result = await controller.findAll(query);

      expect(result).toEqual(mockListResult);
      expect(adminService.findAll).toHaveBeenCalledWith(query);
    });

    it('debe retornar la estructura correcta de paginación', async () => {
      const result = await controller.findAll({});

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('debe retornar un doctor por ID', async () => {
      const result = await controller.findOne('doctor-uuid');

      expect(result).toEqual(mockDoctorResponse);
      expect(adminService.findOne).toHaveBeenCalledWith('doctor-uuid');
    });
  });

  describe('update', () => {
    const updateDto: UpdateDoctorDto = { name: 'Carlos Alberto' };

    it('debe actualizar un doctor y retornar DoctorResponseDto', async () => {
      const result = await controller.update('doctor-uuid', updateDto, mockUser);

      expect(result).toEqual(mockDoctorResponse);
      expect(adminService.update).toHaveBeenCalledWith('doctor-uuid', updateDto, 'admin-uuid');
    });
  });

  describe('disable', () => {
    it('debe deshabilitar un doctor y retornar isActive=false', async () => {
      const result = await controller.disable('doctor-uuid', mockUser);

      expect(result.isActive).toBe(false);
      expect(adminService.disable).toHaveBeenCalledWith('doctor-uuid', 'admin-uuid');
    });
  });

  describe('enable', () => {
    it('debe habilitar un doctor y retornar isActive=true', async () => {
      const result = await controller.enable('doctor-uuid', mockUser);

      expect(result.isActive).toBe(true);
      expect(adminService.enable).toHaveBeenCalledWith('doctor-uuid', 'admin-uuid');
    });
  });
});

describe('RolesGuard (integración con AdminController)', () => {
  it('debe permitir acceso cuando el usuario tiene rol ADMIN', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    const context = {
      getHandler: () => ({}),
      getClass: () => {
        const cls = () => {};
        Reflect.defineMetadata(ROLES_KEY, [Role.ADMIN], cls);
        return cls as unknown as new () => unknown;
      },
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'admin-uuid' } }),
      }),
    } as Parameters<typeof guard.canActivate>[0];

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('debe lanzar ForbiddenException si el usuario no tiene el rol requerido', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    const doctorClass = () => {};
    Reflect.defineMetadata(ROLES_KEY, [Role.ADMIN], doctorClass);

    const context = {
      getHandler: () => ({}),
      getClass: () => doctorClass as unknown as new () => unknown,
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'doctor-uuid', doctor: { id: 'doc-1' } } }),
      }),
    } as Parameters<typeof guard.canActivate>[0];

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
