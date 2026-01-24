import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { UpdatePatientAntecedentsDto } from './dto/update-patient-antecedents.dto';
import { PatientResponseDto } from './dto/patient-response.dto';
import { PatientAntecedentsDto } from './dto/patient-antecedents.dto';
import { Gender } from 'src/core/enum/gender.enum';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPatientDto: CreatePatientDto): Promise<PatientResponseDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createPatientDto.email },
          { phone: createPatientDto.phone },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con este email o teléfono');
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

  async findAll(): Promise<PatientResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: {
        patient: { isNot: null },
      },
      include: {
        patient: true,
      },
    });

    return users.map((user) => this.mapToPatientResponse(user));
  }

  async findOne(id: string): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    return this.mapToPatientResponseFromPatient(patient);
  }

  async update(id: string, updatePatientDto: UpdatePatientDto): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
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
        throw new ConflictException('Ya existe un usuario con este email o teléfono');
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

  async remove(id: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    await this.prisma.$transaction([
      this.prisma.patient.delete({ where: { id } }),
      this.prisma.user.delete({ where: { id: patient.userId } }),
    ]);
  }

  async getAntecedents(id: string): Promise<PatientAntecedentsDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
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
      throw new NotFoundException('Paciente no encontrado');
    }

    const updatedPatient = await this.prisma.patient.update({
      where: { id },
      data: {
        allergies: updateAntecedentsDto.allergies ?? patient.allergies,
        medications: updateAntecedentsDto.medications ?? patient.medications,
        medicalHistory: updateAntecedentsDto.medicalHistory ?? patient.medicalHistory,
        familyHistory: updateAntecedentsDto.familyHistory ?? patient.familyHistory,
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
      gender: patient.gender as Gender | undefined,
      birthDate: patient.birthDate ?? undefined,
      address: patient.address ?? undefined,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }
}
