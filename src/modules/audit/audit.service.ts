import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogQueryDto } from './dto';

export interface AuditLogEntry {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previousState?: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newState?: Record<string, any> | null;
  result: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogResultDto {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  result: string;
  errorMessage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditLogListResultDto {
  items: AuditLogResultDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface AuditLogWithUser {
  id: string;
  userId: string;
  user: { name: string; lastName: string };
  action: string;
  entityType: string;
  entityId: string | null;
  previousState: unknown;
  newState: unknown;
  result: string;
  errorMessage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<AuditLogResultDto> {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        previousState: entry.previousState ?? undefined,
        newState: entry.newState ?? undefined,
        result: entry.result,
        errorMessage: entry.errorMessage,
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

    return this.mapToDto(auditLog as unknown as AuditLogWithUser);
  }

  async findAll(
    query: AuditLogQueryDto,
  ): Promise<AuditLogListResultDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Record<string, unknown> = {};

    if (query.action) {
      where.action = query.action;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      const createdAt: Record<string, Date> = {};
      if (query.startDate) {
        createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        createdAt.lte = new Date(query.endDate);
      }
      where.createdAt = createdAt;
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item) =>
        this.mapToDto(item as unknown as AuditLogWithUser),
      ),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string): Promise<AuditLogResultDto> {
    const auditLog = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            lastName: true,
          },
        },
      },
    });

    if (!auditLog) {
      throw new NotFoundException('audit-log-not-found');
    }

    return this.mapToDto(auditLog as unknown as AuditLogWithUser);
  }

  private mapToDto(auditLog: AuditLogWithUser): AuditLogResultDto {
    return {
      id: auditLog.id,
      userId: auditLog.userId,
      userName: `${auditLog.user.name} ${auditLog.user.lastName}`,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      previousState: auditLog.previousState as Record<string, unknown> | null,
      newState: auditLog.newState as Record<string, unknown> | null,
      result: auditLog.result,
      errorMessage: auditLog.errorMessage,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt,
    };
  }
}
