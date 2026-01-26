import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClinicHistoryDto } from './dto/create-clinic-history.dto';
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

@Injectable()
export class ClinicHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createClinicHistoryDto: CreateClinicHistoryDto,
  ): Promise<ClinicHistoryResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
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

    const clinicHistory = await this.prisma.clinicHistory.create({
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

    return this.mapToClinicHistoryResponse(clinicHistory);
  }

  async findAll(): Promise<ClinicHistoryResponseDto[]> {
    const clinicHistories = await this.prisma.clinicHistory.findMany({
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

  async findOne(id: string): Promise<ClinicHistoryResponseDto> {
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

    return this.mapToClinicHistoryResponse(clinicHistory);
  }

  async findByPatient(patientId: string): Promise<ClinicHistoryResponseDto[]> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    const clinicHistories = await this.prisma.clinicHistory.findMany({
      where: { patientId },
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

  private mapToClinicHistoryResponse(clinicHistory: {
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    appointmentId: string;
    consultationReason: string;
    symptoms: string[];
    treatment: string;
    createdAt: Date;
    updatedAt: Date;
    patient: {
      id: string;
      user: { name: string; lastName: string };
    };
    doctor: {
      id: string;
      user: { name: string; lastName: string };
      specialty: { name: string };
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
      appointmentId: clinicHistory.appointmentId,
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
