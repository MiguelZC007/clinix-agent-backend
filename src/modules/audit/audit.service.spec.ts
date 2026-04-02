import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, AuditLogEntry } from './audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from 'src/prisma/__mocks__/prisma.service.mock';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: MockPrismaService;

  const mockAuditLog = {
    id: 'audit-uuid',
    userId: 'user-uuid',
    user: { name: 'Admin', lastName: 'Test' },
    action: 'CREATE',
    entityType: 'Doctor',
    entityId: 'doctor-uuid',
    previousState: null,
    newState: { name: 'Carlos', lastName: 'García' },
    result: 'SUCCESS',
    errorMessage: null,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2026-01-15'),
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log()', () => {
    const entry: AuditLogEntry = {
      userId: 'user-uuid',
      action: 'CREATE',
      entityType: 'Doctor',
      entityId: 'doctor-uuid',
      newState: { name: 'Carlos', lastName: 'García' },
      result: 'SUCCESS',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    };

    it('debe crear un registro de auditoría exitosamente', async () => {
      prisma.auditLog.create.mockResolvedValue(mockAuditLog);

      const result = await service.log(entry);

      expect(result).toBeDefined();
      expect(result.id).toBe('audit-uuid');
      expect(result.action).toBe('CREATE');
      expect(result.entityType).toBe('Doctor');
      expect(result.result).toBe('SUCCESS');
      expect(result.userName).toBe('Admin Test');
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          previousState: undefined,
          newState: entry.newState,
          result: entry.result,
          errorMessage: undefined,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
        include: {
          user: {
            select: {
              name: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('debe registrar con previousState para actualizaciones', async () => {
      const updateEntry: AuditLogEntry = {
        userId: 'user-uuid',
        action: 'UPDATE',
        entityType: 'Doctor',
        entityId: 'doctor-uuid',
        previousState: { name: 'Carlos' },
        newState: { name: 'Carlos Alberto' },
        result: 'SUCCESS',
      };

      prisma.auditLog.create.mockResolvedValue({
        ...mockAuditLog,
        action: 'UPDATE',
        previousState: updateEntry.previousState,
        newState: updateEntry.newState,
      });

      const result = await service.log(updateEntry);

      expect(result.action).toBe('UPDATE');
      expect(result.previousState).toEqual({ name: 'Carlos' });
      expect(result.newState).toEqual({ name: 'Carlos Alberto' });
    });

    it('debe registrar errores de resultado FAILURE', async () => {
      const failEntry: AuditLogEntry = {
        userId: 'user-uuid',
        action: 'CREATE',
        entityType: 'Doctor',
        result: 'FAILURE',
        errorMessage: 'Duplicate license number',
      };

      prisma.auditLog.create.mockResolvedValue({
        ...mockAuditLog,
        result: 'FAILURE',
        errorMessage: 'Duplicate license number',
      });

      const result = await service.log(failEntry);

      expect(result.result).toBe('FAILURE');
      expect(result.errorMessage).toBe('Duplicate license number');
    });
  });

  describe('findAll()', () => {
    it('debe retornar lista paginada de logs de auditoría', async () => {
      prisma.auditLog.findMany.mockResolvedValue([mockAuditLog]);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('debe aplicar filtros correctamente', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({
        action: 'CREATE',
        entityType: 'Doctor',
        userId: 'user-uuid',
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'CREATE',
            entityType: 'Doctor',
            userId: 'user-uuid',
          }),
        }),
      );
    });

    it('debe aplicar filtro de fechas correctamente', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.999Z',
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-01-01T00:00:00.000Z'),
              lte: new Date('2026-12-31T23:59:59.999Z'),
            },
          }),
        }),
      );
    });

    it('debe paginar correctamente', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 3, pageSize: 10 });

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(5);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('findOne()', () => {
    it('debe retornar un log de auditoría por ID', async () => {
      prisma.auditLog.findUnique.mockResolvedValue(mockAuditLog);

      const result = await service.findOne('audit-uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('audit-uuid');
      expect(prisma.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: 'audit-uuid' },
        include: {
          user: {
            select: {
              name: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('debe lanzar error si el log no existe', async () => {
      prisma.auditLog.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        'audit-log-not-found',
      );
    });
  });
});
