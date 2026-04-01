import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import { DoctorListQueryDto } from './dto/doctor-list-query.dto';
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
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDoctorDto: CreateDoctorDto,
    actorId: string,
  ): Promise<DoctorResponseDto> {
    const hashedPassword = createDoctorDto.password
      ? await bcrypt.hash(createDoctorDto.password, environment.SALT_ROUND)
      : undefined;

    const user = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [
            { email: createDoctorDto.email },
            { phone: createDoctorDto.phone },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('user-already-exists');
      }

      // Fix: Validate specialtyId exists before create
      const specialty = await tx.specialty.findUnique({
        where: { id: createDoctorDto.specialtyId },
      });
      if (!specialty) {
        throw new NotFoundException('specialty-not-found');
      }

      // Fix: Check licenseNumber uniqueness before create
      const existingLicense = await tx.doctor.findFirst({
        where: { licenseNumber: createDoctorDto.licenseNumber },
      });
      if (existingLicense) {
        throw new ConflictException('license-number-already-exists');
      }

      const newUser = await tx.user.create({
        data: {
          email: createDoctorDto.email,
          name: createDoctorDto.name,
          lastName: createDoctorDto.lastName,
          phone: createDoctorDto.phone,
          password: hashedPassword,
          role: 'DOCTOR',
          doctor: {
            create: {
              specialtyId: createDoctorDto.specialtyId,
              licenseNumber: createDoctorDto.licenseNumber,
            },
          },
        },
        include: {
          doctor: {
            include: { specialty: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          targetId: newUser.id,
          action: 'CREATE_DOCTOR',
          changes: {
            email: newUser.email,
            name: newUser.name,
            lastName: newUser.lastName,
            phone: newUser.phone,
            specialtyId: createDoctorDto.specialtyId,
            licenseNumber: createDoctorDto.licenseNumber,
          },
        },
      });

      return newUser;
    });

    return this.mapToDoctorResponse(user);
  }

  async findAll(query: DoctorListQueryDto): Promise<DoctorListResultDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const search = query.search?.trim();

    const userFilter = search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          },
        }
      : {};

    const where = { ...userFilter };

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          specialty: true,
        },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    const items = doctors.map((d) => this.mapToDoctorResponseFromDoctor(d));
    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string): Promise<DoctorResponseDto> {
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

    return this.mapToDoctorResponseFromDoctor(doctor);
  }

  async update(
    id: string,
    updateDoctorDto: UpdateDoctorDto,
    actorId: string,
  ): Promise<DoctorResponseDto> {
    const updatedDoctor = await this.prisma.$transaction(async (tx) => {
      const doctor = await tx.doctor.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!doctor) {
        throw new NotFoundException('doctor-not-found');
      }

      // Fix 6: Validate specialtyId exists before update
      if (updateDoctorDto.specialtyId) {
        const specialty = await tx.specialty.findUnique({
          where: { id: updateDoctorDto.specialtyId },
        });
        if (!specialty) {
          throw new NotFoundException('specialty-not-found');
        }
      }

      // Fix 5: Build { before, after } diff for audit log
      const before: Record<string, any> = {
        email: doctor.user.email,
        name: doctor.user.name,
        lastName: doctor.user.lastName,
        phone: doctor.user.phone,
        specialtyId: doctor.specialtyId,
        licenseNumber: doctor.licenseNumber,
      };

      const after: Record<string, any> = {};
      if (updateDoctorDto.email) after.email = updateDoctorDto.email;
      if (updateDoctorDto.name) after.name = updateDoctorDto.name;
      if (updateDoctorDto.lastName) after.lastName = updateDoctorDto.lastName;
      if (updateDoctorDto.phone) after.phone = updateDoctorDto.phone;
      if (updateDoctorDto.specialtyId) after.specialtyId = updateDoctorDto.specialtyId;
      if (updateDoctorDto.licenseNumber) after.licenseNumber = updateDoctorDto.licenseNumber;

      const changes = { before, after };

      // Fix 8: hashedPassword inside transaction
      const hashedPassword = updateDoctorDto.password
        ? await bcrypt.hash(updateDoctorDto.password, environment.SALT_ROUND)
        : undefined;

      const userData: Record<string, unknown> = {};
      if (updateDoctorDto.email) userData.email = updateDoctorDto.email;
      if (updateDoctorDto.name) userData.name = updateDoctorDto.name;
      if (updateDoctorDto.lastName) userData.lastName = updateDoctorDto.lastName;
      if (updateDoctorDto.phone) userData.phone = updateDoctorDto.phone;
      if (hashedPassword) userData.password = hashedPassword;

      if (updateDoctorDto.email || updateDoctorDto.phone) {
        const existingUser = await tx.user.findFirst({
          where: {
            AND: [
              { id: { not: doctor.userId } },
              {
                OR: [
                  updateDoctorDto.email
                    ? { email: updateDoctorDto.email }
                    : {},
                  updateDoctorDto.phone
                    ? { phone: updateDoctorDto.phone }
                    : {},
                ].filter((obj) => Object.keys(obj).length > 0),
              },
            ],
          },
        });

        if (existingUser) {
          throw new ConflictException('user-already-exists');
        }
      }

      // Fix: Check licenseNumber uniqueness on update
      if (updateDoctorDto.licenseNumber) {
        const existingLicense = await tx.doctor.findFirst({
          where: {
            id: { not: id },
            licenseNumber: updateDoctorDto.licenseNumber,
          },
        });
        if (existingLicense) {
          throw new ConflictException('license-number-already-exists');
        }
      }

      const doctorData: Record<string, unknown> = {};
      if (updateDoctorDto.specialtyId) doctorData.specialtyId = updateDoctorDto.specialtyId;
      if (updateDoctorDto.licenseNumber) doctorData.licenseNumber = updateDoctorDto.licenseNumber;

      const updated = await tx.doctor.update({
        where: { id },
        data: {
          ...doctorData,
          user: {
            update: userData,
          },
        },
        include: {
          user: true,
          specialty: true,
        },
      });

      // Fix 1+2: Audit log INSIDE transaction with actual changes
      await tx.auditLog.create({
        data: {
          actorId,
          targetId: updated.userId,
          action: 'UPDATE_DOCTOR',
          changes,
        },
      });

      return updated;
    });

    return this.mapToDoctorResponseFromDoctor(updatedDoctor);
  }

  async disable(id: string, actorId: string): Promise<DoctorResponseDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const doctor = await tx.doctor.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!doctor) {
        throw new NotFoundException('doctor-not-found');
      }

      await tx.user.update({
        where: { id: doctor.userId },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          targetId: doctor.userId,
          action: 'DISABLE_DOCTOR',
          changes: { isActive: { before: doctor.user.isActive, after: false } },
        },
      });

      return tx.doctor.findUnique({
        where: { id },
        include: { user: true, specialty: true },
      });
    });

    return this.mapToDoctorResponseFromDoctor(updated!);
  }

  async enable(id: string, actorId: string): Promise<DoctorResponseDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const doctor = await tx.doctor.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!doctor) {
        throw new NotFoundException('doctor-not-found');
      }

      await tx.user.update({
        where: { id: doctor.userId },
        data: { isActive: true },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          targetId: doctor.userId,
          action: 'ENABLE_DOCTOR',
          changes: { isActive: { before: doctor.user.isActive, after: true } },
        },
      });

      return tx.doctor.findUnique({
        where: { id },
        include: { user: true, specialty: true },
      });
    });

    return this.mapToDoctorResponseFromDoctor(updated!);
  }

  private mapToDoctorResponse(user: {
    id: string;
    email: string;
    name: string;
    lastName: string;
    phone: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    doctor: {
      id: string;
      licenseNumber: string;
      specialtyId: string;
      specialty: { name: string };
    } | null;
  }): DoctorResponseDto {
    if (!user.doctor) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        phone: user.phone,
        isActive: user.isActive,
        licenseNumber: '',
        specialtyId: '',
        specialtyName: '',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }
    return this.mapToDoctorResponseFromDoctor({
      ...user.doctor,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      user: {
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        phone: user.phone,
        isActive: user.isActive,
      },
    });
  }

  private mapToDoctorResponseFromDoctor(doctor: {
    id: string;
    licenseNumber: string;
    specialtyId: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      email: string;
      name: string;
      lastName: string;
      phone: string;
      isActive: boolean;
    };
    specialty: { name: string };
  }): DoctorResponseDto {
    return {
      id: doctor.id,
      email: doctor.user.email,
      name: doctor.user.name,
      lastName: doctor.user.lastName,
      phone: doctor.user.phone,
      isActive: doctor.user.isActive,
      licenseNumber: doctor.licenseNumber,
      specialtyId: doctor.specialtyId,
      specialtyName: doctor.specialty.name,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };
  }
}
