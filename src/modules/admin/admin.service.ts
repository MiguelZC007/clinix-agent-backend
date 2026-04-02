import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDoctorDto,
  UpdateDoctorDto,
  DoctorResponseDto,
  DoctorListQueryDto,
} from './dto';
import environment from 'src/core/config/environments';

export interface DoctorListResultDto {
  items: DoctorResponseDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createDoctor(
    dto: CreateDoctorDto,
    adminUserId: string,
  ): Promise<DoctorResponseDto> {
    const hashedPassword = dto.password
      ? await bcrypt.hash(dto.password, environment.SALT_ROUND)
      : undefined;

    const doctor = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [{ email: dto.email }, { phone: dto.phone }],
        },
      });

      if (existingUser) {
        throw new ConflictException('user-already-exists');
      }

      const existingLicense = await tx.doctor.findFirst({
        where: { licenseNumber: dto.licenseNumber },
      });

      if (existingLicense) {
        throw new ConflictException('license-number-already-exists');
      }

      const specialty = await tx.specialty.findUnique({
        where: { id: dto.specialtyId },
      });

      if (!specialty) {
        throw new NotFoundException('specialty-not-found');
      }

      return tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          lastName: dto.lastName,
          phone: dto.phone,
          password: hashedPassword,
          doctor: {
            create: {
              specialtyId: dto.specialtyId,
              licenseNumber: dto.licenseNumber,
            },
          },
        },
        include: {
          doctor: {
            include: {
              specialty: true,
            },
          },
        },
      });
    });

    const response = this.mapToDoctorResponseFromUser(doctor);

    try {
      await this.auditService.log({
        userId: adminUserId,
        action: 'CREATE',
        entityType: 'Doctor',
        entityId: response.id,
        newState: this.sanitizeForAudit(response),
        result: 'SUCCESS',
      });
    } catch (auditError) {
      this.logger.error(
        `Failed to audit CREATE doctor: ${auditError instanceof Error ? auditError.message : 'unknown'}`,
      );
    }

    return response;
  }

  async findAllDoctors(
    query: DoctorListQueryDto,
  ): Promise<DoctorListResultDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const search = query.search?.trim();

    const where: Record<string, unknown> = {};

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.specialtyId) {
      where.specialtyId = query.specialtyId;
    }

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        include: {
          user: true,
          specialty: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.doctor.count({ where }),
    ]);

    return {
      items: doctors.map((doc) => this.mapToDoctorResponse(doc)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOneDoctor(id: string): Promise<DoctorResponseDto> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: true,
        specialty: true,
      },
    });

    if (!doctor) {
      throw new NotFoundException('doctor-not-found');
    }

    return this.mapToDoctorResponse(doctor);
  }

  async updateDoctor(
    id: string,
    dto: UpdateDoctorDto,
    adminUserId: string,
  ): Promise<DoctorResponseDto> {
    const existing = await this.findOneDoctor(id);

    if (dto.specialtyId) {
      const specialty = await this.prisma.specialty.findUnique({
        where: { id: dto.specialtyId },
      });
      if (!specialty) {
        throw new NotFoundException('specialty-not-found');
      }
    }

    if (dto.licenseNumber) {
      const existingLicense = await this.prisma.doctor.findFirst({
        where: {
          licenseNumber: dto.licenseNumber,
          NOT: { id },
        },
      });
      if (existingLicense) {
        throw new ConflictException('license-number-already-exists');
      }
    }

    const userData: Record<string, unknown> = {};
    if (dto.name !== undefined) userData.name = dto.name;
    if (dto.lastName !== undefined) userData.lastName = dto.lastName;

    const doctorData: Record<string, unknown> = {};
    if (dto.specialtyId !== undefined) doctorData.specialtyId = dto.specialtyId;
    if (dto.licenseNumber !== undefined)
      doctorData.licenseNumber = dto.licenseNumber;

    const updated = await this.prisma.doctor.update({
      where: { id },
      data: {
        ...doctorData,
        ...(Object.keys(userData).length > 0 && {
          user: { update: userData },
        }),
      },
      include: {
        user: true,
        specialty: true,
      },
    });

    const response = this.mapToDoctorResponse(updated);

    try {
      await this.auditService.log({
        userId: adminUserId,
        action: 'UPDATE',
        entityType: 'Doctor',
        entityId: id,
        previousState: this.sanitizeForAudit(existing),
        newState: this.sanitizeForAudit(response),
        result: 'SUCCESS',
      });
    } catch (auditError) {
      this.logger.error(
        `Failed to audit UPDATE doctor: ${auditError instanceof Error ? auditError.message : 'unknown'}`,
      );
    }

    return response;
  }

  async deactivateDoctor(
    id: string,
    adminUserId: string,
  ): Promise<DoctorResponseDto> {
    const existingRaw = await this.prisma.doctor.findUnique({
      where: { id },
      include: { user: true, specialty: true },
    });

    if (!existingRaw) {
      throw new NotFoundException('doctor-not-found');
    }

    if (!existingRaw.user.isActive) {
      throw new ConflictException('doctor-already-inactive');
    }

    const updated = await this.prisma.doctor.update({
      where: { id },
      data: {
        user: { update: { isActive: false } },
      },
      include: { user: true, specialty: true },
    });

    const response = this.mapToDoctorResponse(updated);

    try {
      await this.auditService.log({
        userId: adminUserId,
        action: 'DEACTIVATE',
        entityType: 'Doctor',
        entityId: id,
        previousState: this.sanitizeForAudit(this.mapToDoctorResponse(existingRaw)),
        newState: this.sanitizeForAudit(response),
        result: 'SUCCESS',
      });
    } catch (auditError) {
      this.logger.error(
        `Failed to audit DEACTIVATE doctor: ${auditError instanceof Error ? auditError.message : 'unknown'}`,
      );
    }

    return response;
  }

  async activateDoctor(
    id: string,
    adminUserId: string,
  ): Promise<DoctorResponseDto> {
    const existingRaw = await this.prisma.doctor.findUnique({
      where: { id },
      include: { user: true, specialty: true },
    });

    if (!existingRaw) {
      throw new NotFoundException('doctor-not-found');
    }

    if (existingRaw.user.isActive) {
      throw new ConflictException('doctor-already-active');
    }

    const updated = await this.prisma.doctor.update({
      where: { id },
      data: {
        user: { update: { isActive: true } },
      },
      include: { user: true, specialty: true },
    });

    const response = this.mapToDoctorResponse(updated);

    try {
      await this.auditService.log({
        userId: adminUserId,
        action: 'ACTIVATE',
        entityType: 'Doctor',
        entityId: id,
        previousState: this.sanitizeForAudit(this.mapToDoctorResponse(existingRaw)),
        newState: this.sanitizeForAudit(response),
        result: 'SUCCESS',
      });
    } catch (auditError) {
      this.logger.error(
        `Failed to audit ACTIVATE doctor: ${auditError instanceof Error ? auditError.message : 'unknown'}`,
      );
    }

    return response;
  }

  private mapToDoctorResponse(
    record: Record<string, unknown>,
  ): DoctorResponseDto {
    const user = record.user as Record<string, unknown> | undefined;
    const specialty = record.specialty as Record<string, unknown> | undefined;

    return {
      id: record.id as string,
      userId: record.userId as string,
      email: (user?.email as string) ?? '',
      name: (user?.name as string) ?? '',
      lastName: (user?.lastName as string) ?? '',
      phone: (user?.phone as string) ?? '',
      specialtyId: record.specialtyId as string,
      specialtyName: (specialty?.name as string) ?? '',
      licenseNumber: record.licenseNumber as string,
      isActive: (user?.isActive as boolean) ?? true,
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
    };
  }

  private mapToDoctorResponseFromUser(
    userRecord: Record<string, unknown>,
  ): DoctorResponseDto {
    const doctor = userRecord.doctor as Record<string, unknown>;
    const specialty = doctor?.specialty as Record<string, unknown> | undefined;

    return {
      id: (doctor?.id as string) ?? '',
      userId: userRecord.id as string,
      email: (userRecord.email as string) ?? '',
      name: (userRecord.name as string) ?? '',
      lastName: (userRecord.lastName as string) ?? '',
      phone: (userRecord.phone as string) ?? '',
      specialtyId: (doctor?.specialtyId as string) ?? '',
      specialtyName: (specialty?.name as string) ?? '',
      licenseNumber: (doctor?.licenseNumber as string) ?? '',
      isActive: (doctor?.isActive as boolean) ?? true,
      createdAt: (doctor?.createdAt as Date) ?? (userRecord.createdAt as Date),
      updatedAt: (doctor?.updatedAt as Date) ?? (userRecord.updatedAt as Date),
    };
  }

  private sanitizeForAudit(
    dto: DoctorResponseDto,
  ): Record<string, unknown> {
    return {
      id: dto.id,
      email: dto.email,
      name: dto.name,
      lastName: dto.lastName,
      phone: dto.phone,
      specialtyId: dto.specialtyId,
      specialtyName: dto.specialtyName,
      licenseNumber: dto.licenseNumber,
      isActive: dto.isActive,
    };
  }
}
