import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdatePatientAntecedentsDto } from './dto/update-patient-antecedents.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import { PatientAntecedentsDto } from './dto/patient-antecedents.dto';
import { PatientListQueryDto } from './dto/patient-list-query.dto';
import { Gender } from 'src/core/enum/gender.enum';
import environment from 'src/core/config/environments';

export interface PatientListResultDto {
  items: PatientResponseDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createPatientDto: CreatePatientDto,
    doctorId?: string,
  ): Promise<PatientResponseDto> {
    // Password is optional - patients can be created without a password
    const hashedPassword = createPatientDto.password
      ? await bcrypt.hash(createPatientDto.password, environment.SALT_ROUND)
      : undefined;

    const user = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [
            { email: createPatientDto.email },
            { phone: createPatientDto.phone },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('user-already-exists');
      }

      return tx.user.create({
        data: {
          email: createPatientDto.email,
          name: createPatientDto.name,
          lastName: createPatientDto.lastName,
          phone: createPatientDto.phone,
          password: hashedPassword,
          patient: {
            create: {
              registeredByDoctorId: doctorId ?? undefined,
              address: createPatientDto.address,
              gender: createPatientDto.gender,
              birthDate:
                createPatientDto.birthDate &&
                createPatientDto.birthDate.trim() !== ''
                  ? new Date(createPatientDto.birthDate)
                  : null,
              allergies: [],
              medications: [],
              medicalHistory: [],
              familyHistory: [],
            },
          },
        },
        include: {
          patient: true,
        },
      });
    });

    return this.mapToPatientResponse(user);
  }

  async findAll(
    query: PatientListQueryDto,
    doctorId: string,
  ): Promise<PatientListResultDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const search = query.search?.trim();

    const searchFilter = search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search } },
            ],
          },
        }
      : {};
    const where = {
      ...searchFilter,
      registeredByDoctorId: doctorId,
    };

    const [patients, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
      this.prisma.patient.count({ where }),
    ]);

    const items = patients.map((p) => this.mapToPatientResponseFromPatient(p));
    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, doctorId: string): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    if (patient.registeredByDoctorId !== doctorId) {
      throw new ForbiddenException('patient-not-owned-by-doctor');
    }

    return this.mapToPatientResponseFromPatient(patient);
  }

  async update(
    id: string,
    updatePatientDto: UpdatePatientDto,
    doctorId: string,
  ): Promise<PatientResponseDto> {
    const hashedPassword = updatePatientDto.password
      ? await bcrypt.hash(updatePatientDto.password, environment.SALT_ROUND)
      : undefined;

    const updatedPatient = await this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!patient) {
        throw new NotFoundException('patient-not-found');
      }

      if (patient.registeredByDoctorId !== doctorId) {
        throw new ForbiddenException('patient-not-owned-by-doctor');
      }

      if (updatePatientDto.email || updatePatientDto.phone) {
        const existingUser = await tx.user.findFirst({
          where: {
            AND: [
              { id: { not: patient.userId } },
              {
                OR: [
                  updatePatientDto.email
                    ? { email: updatePatientDto.email }
                    : {},
                  updatePatientDto.phone
                    ? { phone: updatePatientDto.phone }
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

      return tx.patient.update({
        where: { id },
        data: {
          address: updatePatientDto.address,
          gender: updatePatientDto.gender,
          birthDate:
            updatePatientDto.birthDate &&
            updatePatientDto.birthDate.trim() !== ''
              ? new Date(updatePatientDto.birthDate)
              : null,
          user: {
            update: {
              email: updatePatientDto.email,
              name: updatePatientDto.name,
              lastName: updatePatientDto.lastName,
              phone: updatePatientDto.phone,
              password: hashedPassword,
            },
          },
        },
        include: {
          user: true,
        },
      });
    });

    return this.mapToPatientResponseFromPatient(updatedPatient);
  }

  async remove(
    id: string,
    doctorId: string,
  ): Promise<{ deleted: true; id: string }> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    if (patient.registeredByDoctorId !== doctorId) {
      throw new ForbiddenException('patient-not-owned-by-doctor');
    }

    await this.prisma.$transaction([
      this.prisma.user.delete({ where: { id: patient.userId } }),
      this.prisma.patient.delete({ where: { id } }),
    ]);

    return { deleted: true, id };
  }

  async getAntecedents(
    id: string,
    doctorId: string,
  ): Promise<PatientAntecedentsDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    if (patient.registeredByDoctorId !== doctorId) {
      throw new ForbiddenException('patient-not-owned-by-doctor');
    }

    return {
      patientId: patient.id,
      allergies: patient.allergies,
      medications: patient.medications,
      medicalHistory: patient.medicalHistory,
      familyHistory: patient.familyHistory,
      updatedAt: patient.updatedAt,
    };
  }

  async updateAntecedents(
    id: string,
    updateAntecedentsDto: UpdatePatientAntecedentsDto,
    doctorId: string,
  ): Promise<PatientAntecedentsDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    if (patient.registeredByDoctorId !== doctorId) {
      throw new ForbiddenException('patient-not-owned-by-doctor');
    }

    const updatedPatient = await this.prisma.patient.update({
      where: { id },
      data: {
        allergies: updateAntecedentsDto.allergies ?? patient.allergies,
        medications: updateAntecedentsDto.medications ?? patient.medications,
        medicalHistory:
          updateAntecedentsDto.medicalHistory ?? patient.medicalHistory,
        familyHistory:
          updateAntecedentsDto.familyHistory ?? patient.familyHistory,
      },
    });

    return {
      patientId: updatedPatient.id,
      allergies: updatedPatient.allergies,
      medications: updatedPatient.medications,
      medicalHistory: updatedPatient.medicalHistory,
      familyHistory: updatedPatient.familyHistory,
      updatedAt: updatedPatient.updatedAt,
    };
  }

  /**
   * Maps a user with nested patient to PatientResponseDto.
   * Consolidated utility function - delegates to mapToPatientResponseFromPatient.
   */
  private mapToPatientResponse(user: {
    id: string;
    email: string;
    name: string;
    lastName: string;
    phone: string;
    createdAt: Date;
    updatedAt: Date;
    patient: {
      id: string;
      patientNumber: number;
      gender: string | null;
      birthDate: Date | null;
      address: string | null;
    } | null;
  }): PatientResponseDto {
    if (!user.patient) {
      // Fallback for when patient data is not available
      return {
        id: user.id,
        patientNumber: 0,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        phone: user.phone,
        gender: undefined,
        birthDate: undefined,
        address: undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }
    // Transform to the format expected by mapToPatientResponseFromPatient
    return this.mapToPatientResponseFromPatient({
      ...user.patient,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      user: {
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        phone: user.phone,
      },
    });
  }

  /**
   * Primary mapping function for patient responses.
   * All patient mapping operations should use this function.
   */
  private mapToPatientResponseFromPatient(patient: {
    id: string;
    patientNumber: number;
    gender: string | null;
    birthDate: Date | null;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      email: string;
      name: string;
      lastName: string;
      phone: string;
    };
  }): PatientResponseDto {
    return {
      id: patient.id,
      patientNumber: patient.patientNumber,
      email: patient.user.email,
      name: patient.user.name,
      lastName: patient.user.lastName,
      phone: patient.user.phone,
      address: patient.address ?? undefined,
      gender: patient.gender as Gender | undefined,
      birthDate: patient.birthDate ?? undefined,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }
}
