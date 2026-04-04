import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClinicHistoryDto } from './dto/create-clinic-history.dto';
import { CreateClinicHistoryWithoutAppointmentDto } from './dto/create-clinic-history-without-appointment.dto';
import { FindAllClinicHistoriesQueryDto } from './dto/find-all-clinic-histories-query.dto';
import {
  ClinicHistoryResponseDto,
  DiagnosticResponseDto,
  PhysicalExamResponseDto,
  VitalSignResponseDto,
  PrescriptionResponseDto,
  PrescriptionMedicationResponseDto,
  ClinicHistoryPatientDto,
  ClinicHistoryDoctorDto,
} from './dto/clinic-history-response.dto';
import { PatientClinicHistoryFilterOptionsDto } from './dto/patient-clinic-history-filter-options.dto';
import {
  PrescriptionConflictType,
  PrescriptionConflict,
} from './dto/prescription-validation.dto';
import { CreatePrescriptionMedicationDto } from './dto/create-prescription-medication.dto';

export interface ClinicHistoryListResultDto {
  items: ClinicHistoryResponseDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class ClinicHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createClinicHistoryDto: CreateClinicHistoryDto,
    doctorId: string,
  ): Promise<ClinicHistoryResponseDto> {
    let warnings: PrescriptionConflict[] = [];

    const clinicHistory = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: createClinicHistoryDto.appointmentId },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true, specialty: true } },
          clinicHistory: true,
        },
      });

      if (!appointment) {
        throw new NotFoundException('appointment-not-found');
      }

      if (appointment.clinicHistory) {
        throw new ConflictException('appointment-already-has-clinic-history');
      }

      if (appointment.doctorId !== doctorId) {
        throw new ForbiddenException('clinic-history-not-owned-by-doctor');
      }

      // Verify patient belongs to the requesting doctor and get allergies/medications
      const patient = await tx.patient.findUnique({
        where: { id: appointment.patientId },
        select: {
          registeredByDoctorId: true,
          allergies: true,
          medications: true,
        },
      });
      if (!patient || patient.registeredByDoctorId !== doctorId) {
        throw new ForbiddenException('patient-not-owned-by-doctor');
      }

      // Validate prescription against patient allergies/medications
      if (createClinicHistoryDto.prescription?.medications) {
        const validationResult = this.validatePrescriptionAgainstPatient(
          createClinicHistoryDto.prescription.medications,
          { allergies: patient.allergies, medications: patient.medications },
        );

        if (validationResult.blockingErrors.length > 0) {
          throw new BadRequestException({
            code: 'PRESCRIPTION_ALLERGY_CONFLICT',
            message:
              'Prescription contains medications that conflict with patient allergies',
            conflicts: validationResult.blockingErrors,
          });
        }

        warnings = validationResult.warnings;
      }

      return tx.clinicHistory.create({
        data: {
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          specialtyId: appointment.specialtyId,
          appointmentId: createClinicHistoryDto.appointmentId,
          consultationReason: createClinicHistoryDto.consultationReason,
          symptoms: createClinicHistoryDto.symptoms,
          treatment: createClinicHistoryDto.treatment,
          diagnostics: {
            create: createClinicHistoryDto.diagnostics.map((d) => ({
              name: d.name,
              description: d.description,
            })),
          },
          physicalExams: {
            create: createClinicHistoryDto.physicalExams.map((p) => ({
              name: p.name,
              description: p.description,
            })),
          },
          vitalSigns: {
            create: createClinicHistoryDto.vitalSigns.map((v) => ({
              name: v.name,
              value: v.value,
              unit: v.unit,
              measurement: v.measurement,
              description: v.description,
            })),
          },
          prescription: createClinicHistoryDto.prescription
            ? {
                create: {
                  name: createClinicHistoryDto.prescription.name,
                  description: createClinicHistoryDto.prescription.description,
                  prescriptionMedications: {
                    create: createClinicHistoryDto.prescription.medications.map(
                      (m) => ({
                        name: m.name,
                        quantity: m.quantity,
                        unit: m.unit,
                        frequency: m.frequency,
                        duration: m.duration,
                        indications: m.indications,
                        administrationRoute: m.administrationRoute,
                        description: m.description,
                      }),
                    ),
                  },
                },
              }
            : undefined,
        },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true, specialty: true } },
          diagnostics: true,
          physicalExams: true,
          vitalSigns: true,
          prescription: {
            include: { prescriptionMedications: true },
          },
        },
      });
    });

    const response = this.mapToClinicHistoryResponse(clinicHistory);
    if (warnings.length > 0) {
      response.warnings = warnings;
    }
    return response;
  }

  async createWithoutAppointment(
    doctorId: string,
    dto: CreateClinicHistoryWithoutAppointmentDto,
  ): Promise<ClinicHistoryResponseDto> {
    let warnings: PrescriptionConflict[] = [];

    const clinicHistory = await this.prisma.$transaction(async (tx) => {
      let resolvedPatientId: string;
      let resolvedSpecialtyId: string;

      const useNumbers =
        typeof dto.patientNumber === 'number' &&
        Number.isInteger(dto.patientNumber) &&
        typeof dto.specialtyCode === 'number' &&
        Number.isInteger(dto.specialtyCode);

      let patient: {
        id: string;
        allergies: string[];
        medications: string[];
      };
      let specialty: { id: string };

      if (useNumbers) {
        const patientByNumber = await tx.patient.findUnique({
          where: { patientNumber: dto.patientNumber },
          select: {
            id: true,
            registeredByDoctorId: true,
            allergies: true,
            medications: true,
          },
        });
        if (!patientByNumber) {
          throw new NotFoundException('patient-not-found');
        }
        if (patientByNumber.registeredByDoctorId !== doctorId) {
          throw new ForbiddenException('patient-not-owned-by-doctor');
        }
        const specialtyByCode = await tx.specialty.findUnique({
          where: { specialtyCode: dto.specialtyCode },
        });
        if (!specialtyByCode) {
          throw new NotFoundException('specialty-not-found');
        }
        patient = patientByNumber;
        specialty = specialtyByCode;
        resolvedPatientId = patient.id;
        resolvedSpecialtyId = specialty.id;
      } else {
        if (dto.patientId == null || dto.specialtyId == null) {
          throw new NotFoundException('patient-not-found');
        }
        resolvedPatientId = dto.patientId;
        resolvedSpecialtyId = dto.specialtyId;
        const patientFound = await tx.patient.findUnique({
          where: { id: resolvedPatientId },
          select: {
            id: true,
            registeredByDoctorId: true,
            allergies: true,
            medications: true,
          },
        });
        if (!patientFound) {
          throw new NotFoundException('patient-not-found');
        }
        if (patientFound.registeredByDoctorId !== doctorId) {
          throw new ForbiddenException('patient-not-owned-by-doctor');
        }
        patient = patientFound;
        const specialtyFound = await tx.specialty.findUnique({
          where: { id: resolvedSpecialtyId },
        });
        if (!specialtyFound) {
          throw new NotFoundException('specialty-not-found');
        }
        specialty = specialtyFound;
      }

      const doctor = await tx.doctor.findUnique({
        where: { id: doctorId },
        include: { specialty: true },
      });
      if (!doctor) {
        throw new NotFoundException('doctor-not-found');
      }

      // Validate prescription against patient allergies/medications
      if (dto.prescription?.medications) {
        const validationResult = this.validatePrescriptionAgainstPatient(
          dto.prescription.medications,
          { allergies: patient.allergies, medications: patient.medications },
        );

        if (validationResult.blockingErrors.length > 0) {
          throw new BadRequestException({
            code: 'PRESCRIPTION_ALLERGY_CONFLICT',
            message:
              'Prescription contains medications that conflict with patient allergies',
            conflicts: validationResult.blockingErrors,
          });
        }

        warnings = validationResult.warnings;
      }

      return tx.clinicHistory.create({
        data: {
          patientId: resolvedPatientId,
          doctorId,
          specialtyId: resolvedSpecialtyId,
          appointmentId: null,
          consultationReason: dto.consultationReason,
          symptoms: dto.symptoms,
          treatment: dto.treatment,
          diagnostics: {
            create: dto.diagnostics.map((d) => ({
              name: d.name,
              description: d.description,
            })),
          },
          physicalExams: {
            create: dto.physicalExams.map((p) => ({
              name: p.name,
              description: p.description,
            })),
          },
          vitalSigns: {
            create: dto.vitalSigns.map((v) => ({
              name: v.name,
              value: v.value,
              unit: v.unit,
              measurement: v.measurement,
              description: v.description,
            })),
          },
          prescription: dto.prescription
            ? {
                create: {
                  name: dto.prescription.name,
                  description: dto.prescription.description,
                  prescriptionMedications: {
                    create: dto.prescription.medications.map((m) => ({
                      name: m.name,
                      quantity: m.quantity,
                      unit: m.unit,
                      frequency: m.frequency,
                      duration: m.duration,
                      indications: m.indications,
                      administrationRoute: m.administrationRoute,
                      description: m.description,
                    })),
                  },
                },
              }
            : undefined,
        },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true, specialty: true } },
          diagnostics: true,
          physicalExams: true,
          vitalSigns: true,
          prescription: {
            include: { prescriptionMedications: true },
          },
        },
      });
    });

    const response = this.mapToClinicHistoryResponse(clinicHistory);
    if (warnings.length > 0) {
      response.warnings = warnings;
    }
    return response;
  }

  async findAll(
    query: FindAllClinicHistoriesQueryDto,
    doctorId: string,
  ): Promise<ClinicHistoryListResultDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = this.buildFindAllWhere(query);
    const whereWithDoctor = {
      ...where,
      doctorId,
    };

    const [clinicHistories, total] = await this.prisma.$transaction([
      this.prisma.clinicHistory.findMany({
        where: whereWithDoctor,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true, specialty: true } },
          diagnostics: true,
          physicalExams: true,
          vitalSigns: true,
          prescription: {
            include: { prescriptionMedications: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clinicHistory.count({ where: whereWithDoctor }),
    ]);

    const items = clinicHistories.map((ch) =>
      this.mapToClinicHistoryResponse(ch),
    );
    return {
      items,
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async findOne(
    id: string,
    doctorId: string,
  ): Promise<ClinicHistoryResponseDto> {
    const clinicHistory = await this.prisma.clinicHistory.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true } },
        diagnostics: true,
        physicalExams: true,
        vitalSigns: true,
        prescription: {
          include: { prescriptionMedications: true },
        },
      },
    });

    if (!clinicHistory) {
      throw new NotFoundException('clinic-history-not-found');
    }

    if (clinicHistory.doctorId !== doctorId) {
      throw new ForbiddenException('clinic-history-not-owned-by-doctor');
    }

    return this.mapToClinicHistoryResponse(clinicHistory);
  }

  async findByPatient(
    patientId: string,
    doctorId: string,
  ): Promise<ClinicHistoryResponseDto[]> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    if (patient.registeredByDoctorId !== doctorId) {
      throw new ForbiddenException('patient-not-owned-by-doctor');
    }

    const clinicHistories = await this.prisma.clinicHistory.findMany({
      where: { patientId, doctorId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true } },
        diagnostics: true,
        physicalExams: true,
        vitalSigns: true,
        prescription: {
          include: { prescriptionMedications: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return clinicHistories.map((ch) => this.mapToClinicHistoryResponse(ch));
  }

  async getFilterOptionsByPatient(
    patientId: string,
    doctorId: string,
  ): Promise<PatientClinicHistoryFilterOptionsDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    if (patient.registeredByDoctorId !== doctorId) {
      throw new ForbiddenException('patient-not-owned-by-doctor');
    }

    const withDoctors = await this.prisma.clinicHistory.findMany({
      where: { patientId, doctorId },
      distinct: ['doctorId'],
      select: {
        doctor: {
          select: {
            id: true,
            user: { select: { name: true, lastName: true } },
          },
        },
      },
    });
    const doctors = withDoctors
      .filter((row) => row.doctor != null)
      .map((row) => ({
        id: row.doctor!.id,
        name: row.doctor!.user.name,
        lastName: row.doctor!.user.lastName,
      }));

    const withSpecialties = await this.prisma.clinicHistory.findMany({
      where: { patientId, doctorId },
      distinct: ['specialtyId'],
      select: {
        specialty: {
          select: { id: true, name: true },
        },
      },
    });
    const specialties = withSpecialties
      .filter((row) => row.specialty != null)
      .map((row) => ({
        id: row.specialty!.id,
        name: row.specialty!.name,
      }));

    return { doctors, specialties };
  }

  private buildFindAllWhere(
    query: FindAllClinicHistoriesQueryDto,
  ): Prisma.ClinicHistoryWhereInput {
    const conditions: Prisma.ClinicHistoryWhereInput[] = [];

    if (query.patientId) {
      conditions.push({ patientId: query.patientId });
    }

    const trimmedSearch =
      typeof query.search === 'string' ? query.search.trim() : '';
    if (trimmedSearch.length > 0) {
      conditions.push({
        OR: [
          {
            patient: {
              user: {
                name: { contains: trimmedSearch, mode: 'insensitive' },
              },
            },
          },
          {
            patient: {
              user: {
                lastName: { contains: trimmedSearch, mode: 'insensitive' },
              },
            },
          },
          {
            consultationReason: {
              contains: trimmedSearch,
              mode: 'insensitive',
            },
          },
          {
            treatment: { contains: trimmedSearch, mode: 'insensitive' },
          },
          {
            diagnostics: {
              some: {
                OR: [
                  {
                    name: { contains: trimmedSearch, mode: 'insensitive' },
                  },
                  {
                    description: {
                      contains: trimmedSearch,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          },
        ],
      });
    }

    if (query.dateFrom || query.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.dateFrom) {
        createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        const endOfDay = new Date(query.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
      conditions.push({ createdAt });
    }

    if (query.doctorId) {
      conditions.push({ doctorId: query.doctorId });
    }

    if (query.specialtyId) {
      conditions.push({ specialtyId: query.specialtyId });
    }

    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];
    return { AND: conditions };
  }

  private validatePrescriptionAgainstPatient(
    medications: CreatePrescriptionMedicationDto[],
    patient: { allergies: string[]; medications: string[] },
  ): { blockingErrors: PrescriptionConflict[]; warnings: PrescriptionConflict[] } {
    const blockingErrors: PrescriptionConflict[] = [];
    const warnings: PrescriptionConflict[] = [];

    // If no medications in prescription, nothing to validate
    if (!medications || medications.length === 0) {
      return { blockingErrors, warnings };
    }

    for (const medication of medications) {
      const medicationNameLower = medication.name.toLowerCase();

      // Check against patient allergies (blocking)
      // Use bidirectional matching: medication contains allergy OR allergy contains medication
      for (const allergy of patient.allergies) {
        const allergyTrimmed = allergy.trim();
        if (!allergyTrimmed) continue;
        const allergyLower = allergyTrimmed.toLowerCase();
        if (
          medicationNameLower.includes(allergyLower) ||
          allergyLower.includes(medicationNameLower)
        ) {
          blockingErrors.push({
            medication: medication.name,
            matchedAgainst: allergyTrimmed,
            type: PrescriptionConflictType.ALLERGY,
          });
        }
      }

      // Check against patient current medications (warning)
      // Use bidirectional matching: prescribed med contains patient med OR patient med contains prescribed med
      for (const currentMed of patient.medications) {
        const currentMedTrimmed = currentMed.trim();
        if (!currentMedTrimmed) continue;
        const currentMedLower = currentMedTrimmed.toLowerCase();
        if (
          medicationNameLower.includes(currentMedLower) ||
          currentMedLower.includes(medicationNameLower)
        ) {
          warnings.push({
            medication: medication.name,
            matchedAgainst: currentMedTrimmed,
            type: PrescriptionConflictType.MEDICATION,
          });
        }
      }
    }

    return { blockingErrors, warnings };
  }

  private mapToClinicHistoryResponse(clinicHistory: {
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    appointmentId: string | null;
    consultationReason: string;
    symptoms: string[];
    treatment: string;
    createdAt: Date;
    updatedAt: Date;
    patient: {
      id: string;
      patientNumber: number;
      user: { name: string; lastName: string };
    };
    doctor: {
      id: string;
      user: { name: string; lastName: string };
      specialty: { name: string; specialtyCode: number };
    };
    diagnostics: Array<{
      id: string;
      name: string;
      description: string;
      createdAt: Date;
    }>;
    physicalExams: Array<{
      id: string;
      name: string;
      description: string;
      createdAt: Date;
    }>;
    vitalSigns: Array<{
      id: string;
      name: string;
      value: string;
      unit: string;
      measurement: string;
      description: string | null;
      createdAt: Date;
    }>;
    prescription: {
      id: string;
      name: string;
      description: string;
      createdAt: Date;
      prescriptionMedications: Array<{
        id: string;
        name: string;
        quantity: number;
        unit: string;
        frequency: string;
        duration: string;
        indications: string;
        administrationRoute: string;
        description: string | null;
      }>;
    } | null;
  }): ClinicHistoryResponseDto {
    const patient: ClinicHistoryPatientDto = {
      id: clinicHistory.patient.id,
      patientNumber: clinicHistory.patient.patientNumber,
      name: clinicHistory.patient.user.name,
      lastName: clinicHistory.patient.user.lastName,
    };

    const doctor: ClinicHistoryDoctorDto = {
      id: clinicHistory.doctor.id,
      name: clinicHistory.doctor.user.name,
      lastName: clinicHistory.doctor.user.lastName,
      specialty: clinicHistory.doctor.specialty.name,
    };

    const diagnostics: DiagnosticResponseDto[] = clinicHistory.diagnostics.map(
      (d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        createdAt: d.createdAt,
      }),
    );

    const physicalExams: PhysicalExamResponseDto[] =
      clinicHistory.physicalExams.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
      }));

    const vitalSigns: VitalSignResponseDto[] = clinicHistory.vitalSigns.map(
      (v) => ({
        id: v.id,
        name: v.name,
        value: v.value,
        unit: v.unit,
        measurement: v.measurement,
        description: v.description ?? undefined,
        createdAt: v.createdAt,
      }),
    );

    let prescription: PrescriptionResponseDto | undefined;
    if (clinicHistory.prescription) {
      const medications: PrescriptionMedicationResponseDto[] =
        clinicHistory.prescription.prescriptionMedications.map((m) => ({
          id: m.id,
          name: m.name,
          quantity: m.quantity,
          unit: m.unit,
          frequency: m.frequency,
          duration: m.duration,
          indications: m.indications,
          administrationRoute: m.administrationRoute,
          description: m.description ?? undefined,
        }));

      prescription = {
        id: clinicHistory.prescription.id,
        name: clinicHistory.prescription.name,
        description: clinicHistory.prescription.description,
        medications,
        createdAt: clinicHistory.prescription.createdAt,
      };
    }

    return {
      id: clinicHistory.id,
      patientId: clinicHistory.patientId,
      doctorId: clinicHistory.doctorId,
      specialtyId: clinicHistory.specialtyId,
      specialtyCode: clinicHistory.doctor.specialty.specialtyCode,
      appointmentId: clinicHistory.appointmentId ?? null,
      consultationReason: clinicHistory.consultationReason,
      symptoms: clinicHistory.symptoms,
      treatment: clinicHistory.treatment,
      diagnostics,
      physicalExams,
      vitalSigns,
      prescription,
      patient,
      doctor,
      createdAt: clinicHistory.createdAt,
      updatedAt: clinicHistory.updatedAt,
    };
  }
}
