import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;
  let auditService: jest.Mocked<AuditService>;

  const mockUser = {
    id: 'admin-uuid',
    email: 'admin@test.com',
    name: 'Admin',
    lastName: 'Test',
    phone: '+584241234567',
    isAdmin: true,
  };

  const mockDoctorResponse = {
    id: 'doctor-uuid',
    userId: 'user-uuid',
    email: 'doctor@ejemplo.com',
    name: 'Carlos',
    lastName: 'García',
    phone: '+584241234567',
    specialtyId: 'specialty-uuid',
    specialtyName: 'Cardiología',
    licenseNumber: 'MP-12345',
    isActive: true,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  };

  beforeEach(async () => {
    const mockAdminService = {
      createDoctor: jest.fn(),
      findAllDoctors: jest.fn(),
      findOneDoctor: jest.fn(),
      updateDoctor: jest.fn(),
      deactivateDoctor: jest.fn(),
      activateDoctor: jest.fn(),
    };

    const mockAuditService = {
      log: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: RolesGuard, useValue: { canActivate: jest.fn().mockReturnValue(true) } },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDoctor()', () => {
    it('debe crear un doctor exitosamente', async () => {
      const dto: CreateDoctorDto = {
        email: 'doctor@ejemplo.com',
        name: 'Carlos',
        lastName: 'García',
        phone: '+584241234567',
        password: 'password123',
        specialtyId: 'specialty-uuid',
        licenseNumber: 'MP-12345',
      };

      adminService.createDoctor.mockResolvedValue(mockDoctorResponse);

      const result = await controller.createDoctor(dto, mockUser);

      expect(result).toEqual(mockDoctorResponse);
      expect(adminService.createDoctor).toHaveBeenCalledWith(dto, mockUser.id);
    });

    it('debe propagar ConflictException del servicio', async () => {
      const dto: CreateDoctorDto = {
        email: 'doctor@ejemplo.com',
        name: 'Carlos',
        lastName: 'García',
        phone: '+584241234567',
        specialtyId: 'specialty-uuid',
        licenseNumber: 'MP-12345',
      };

      adminService.createDoctor.mockRejectedValue(
        new ConflictException('user-already-exists'),
      );

      await expect(
        controller.createDoctor(dto, mockUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllDoctors()', () => {
    it('debe retornar lista de doctores', async () => {
      const mockResult = {
        items: [mockDoctorResponse],
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      };

      adminService.findAllDoctors.mockResolvedValue(mockResult);

      const result = await controller.findAllDoctors({ page: 1, pageSize: 10 });

      expect(result).toEqual(mockResult);
      expect(adminService.findAllDoctors).toHaveBeenCalled();
    });
  });

  describe('findOneDoctor()', () => {
    it('debe retornar un doctor por ID', async () => {
      adminService.findOneDoctor.mockResolvedValue(mockDoctorResponse);

      const result = await controller.findOneDoctor('doctor-uuid');

      expect(result).toEqual(mockDoctorResponse);
      expect(adminService.findOneDoctor).toHaveBeenCalledWith('doctor-uuid');
    });

    it('debe propagar NotFoundException', async () => {
      adminService.findOneDoctor.mockRejectedValue(
        new NotFoundException('doctor-not-found'),
      );

      await expect(
        controller.findOneDoctor('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDoctor()', () => {
    it('debe actualizar un doctor exitosamente', async () => {
      const dto: UpdateDoctorDto = { licenseNumber: 'MP-99999' };
      const updatedResponse = {
        ...mockDoctorResponse,
        licenseNumber: 'MP-99999',
      };

      adminService.updateDoctor.mockResolvedValue(updatedResponse);

      const result = await controller.updateDoctor('doctor-uuid', dto, mockUser);

      expect(result.licenseNumber).toBe('MP-99999');
      expect(adminService.updateDoctor).toHaveBeenCalledWith(
        'doctor-uuid',
        dto,
        mockUser.id,
      );
    });
  });

  describe('deactivateDoctor()', () => {
    it('debe desactivar un doctor exitosamente', async () => {
      const deactivatedResponse = { ...mockDoctorResponse, isActive: false };
      adminService.deactivateDoctor.mockResolvedValue(deactivatedResponse);

      const result = await controller.deactivateDoctor('doctor-uuid', mockUser);

      expect(result.isActive).toBe(false);
      expect(adminService.deactivateDoctor).toHaveBeenCalledWith(
        'doctor-uuid',
        mockUser.id,
      );
    });
  });

  describe('activateDoctor()', () => {
    it('debe reactivar un doctor exitosamente', async () => {
      adminService.activateDoctor.mockResolvedValue(mockDoctorResponse);

      const result = await controller.activateDoctor('doctor-uuid', mockUser);

      expect(result.isActive).toBe(true);
      expect(adminService.activateDoctor).toHaveBeenCalledWith(
        'doctor-uuid',
        mockUser.id,
      );
    });
  });

  describe('findAuditLogs()', () => {
    it('debe retornar logs de auditoría', async () => {
      const mockResult = {
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      };

      auditService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAuditLogs({ page: 1, pageSize: 20 });

      expect(result).toEqual(mockResult);
      expect(auditService.findAll).toHaveBeenCalled();
    });

    it('debe pasar filtros al servicio de auditoría', async () => {
      auditService.findAll.mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      });

      await controller.findAuditLogs({
        action: 'CREATE',
        entityType: 'Doctor',
        userId: 'user-uuid',
      });

      expect(auditService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entityType: 'Doctor',
          userId: 'user-uuid',
        }),
      );
    });
  });

  describe('findOneAuditLog()', () => {
    it('debe retornar un log de auditoría por ID', async () => {
      const mockLog = {
        id: 'log-uuid',
        userId: 'user-uuid',
        userName: 'Admin Test',
        action: 'CREATE',
        entityType: 'Doctor',
        entityId: 'doctor-uuid',
        entityName: 'Dr. Carlos García',
        previousState: null,
        newState: { licenseNumber: 'MP-12345' },
        result: 'SUCCESS',
        errorMessage: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      };

      auditService.findOne.mockResolvedValue(mockLog);

      const result = await controller.findOneAuditLog('log-uuid');

      expect(result).toEqual(mockLog);
      expect(auditService.findOne).toHaveBeenCalledWith('log-uuid');
    });

    it('debe propagar NotFoundException si el log no existe', async () => {
      auditService.findOne.mockRejectedValue(
        new NotFoundException('audit-log-not-found'),
      );

      await expect(
        controller.findOneAuditLog('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
