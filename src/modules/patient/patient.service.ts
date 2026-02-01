import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdatePatientAntecedentsDto } from './dto/update-patient-antecedents.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import { PatientAntecedentsDto } from './dto/patient-antecedents.dto';
import { PatientListQueryDto } from './dto/patient-list-query.dto';
import { Gender } from 'src/core/enum/gender.enum';

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
  ): Promise<PatientResponseDto> {
    const existingUser = await this.prisma.user.findFirst({
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

    const user = await this.prisma.user.create({
      data: {
        email: createPatientDto.email,
        name: createPatientDto.name,
        lastName: createPatientDto.lastName,
        phone: createPatientDto.phone,
        password: createPatientDto.password,
        patient: {
          create: {
            address: createPatientDto.address,
            gender: createPatientDto.gender,
            birthDate: createPatientDto.birthDate
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

    return this.mapToPatientResponse(user);
  }

  async findAll(
    query: PatientListQueryDto,
  ): Promise<PatientListResultDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const search = query.search?.trim();

    const where = search
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

  async findOne(id: string): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    return this.mapToPatientResponseFromPatient(patient);
  }

  async update(
    id: string,
    updatePatientDto: UpdatePatientDto,
  ): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    if (updatePatientDto.email || updatePatientDto.phone) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: patient.userId } },
            {
              OR: [
                updatePatientDto.email ? { email: updatePatientDto.email } : {},
                updatePatientDto.phone ? { phone: updatePatientDto.phone } : {},
              ].filter((obj) => Object.keys(obj).length > 0),
            },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('user-already-exists');
      }
    }

    const updatedPatient = await this.prisma.patient.update({
      where: { id },
      data: {
        address: updatePatientDto.address,
        gender: updatePatientDto.gender,
        birthDate: updatePatientDto.birthDate
          ? new Date(updatePatientDto.birthDate)
          : undefined,
        user: {
          update: {
            email: updatePatientDto.email,
            name: updatePatientDto.name,
            lastName: updatePatientDto.lastName,
            phone: updatePatientDto.phone,
            password: updatePatientDto.password,
          },
        },
      },
      include: {
        user: true,
      },
    });

    return this.mapToPatientResponseFromPatient(updatedPatient);
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    await this.prisma.$transaction([
      this.prisma.patient.delete({ where: { id } }),
      this.prisma.user.delete({ where: { id: patient.userId } }),
    ]);

    return { deleted: true, id };
  }

  async getAntecedents(id: string): Promise<PatientAntecedentsDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
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
  ): Promise<PatientAntecedentsDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
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
      gender: string | null;
      birthDate: Date | null;
      address: string | null;
    } | null;
  }): PatientResponseDto {
    return {
      id: user.patient?.id ?? user.id,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      phone: user.phone,
      gender: user.patient?.gender as Gender | undefined,
      birthDate: user.patient?.birthDate ?? undefined,
      address: user.patient?.address ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapToPatientResponseFromPatient(patient: {
    id: string;
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
