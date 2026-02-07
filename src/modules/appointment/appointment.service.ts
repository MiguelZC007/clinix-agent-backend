import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import {
  AppointmentResponseDto,
  AppointmentPatientDto,
  AppointmentDoctorDto,
} from './dto/appointment-response.dto';
import { SpecialtyItemDto } from './dto/specialty-item.dto';
import { StatusAppointment } from 'src/core/enum/statusAppointment.enum';
import { PaginationResponseDto } from 'src/core/dto/pagination-response.dto';

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) { }

  async findSpecialties(): Promise<SpecialtyItemDto[]> {
    const rows = await this.prisma.specialty.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }

  async create(
    createAppointmentDto: CreateAppointmentDto,
    doctorId: string,
  ): Promise<AppointmentResponseDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: createAppointmentDto.patientId },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { user: true, specialty: true },
    });

    if (!doctor) {
      throw new NotFoundException('doctor-not-found');
    }

    const specialty = await this.prisma.specialty.findUnique({
      where: { id: createAppointmentDto.specialtyId },
    });

    if (!specialty) {
      throw new NotFoundException('specialty-not-found');
    }

    const startDate = new Date(createAppointmentDto.startAppointment);
    const endDate = new Date(createAppointmentDto.endAppointment);

    if (startDate >= endDate) {
      throw new BadRequestException('invalid-date-range');
    }

    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        status: {
          in: [StatusAppointment.PENDING, StatusAppointment.CONFIRMED],
        },
        OR: [
          {
            startAppointment: { lte: startDate },
            endAppointment: { gt: startDate },
          },
          {
            startAppointment: { lt: endDate },
            endAppointment: { gte: endDate },
          },
          {
            startAppointment: { gte: startDate },
            endAppointment: { lte: endDate },
          },
        ],
      },
    });

    if (conflictingAppointment) {
      throw new ConflictException('appointment-conflict');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId: createAppointmentDto.patientId,
        doctorId,
        specialtyId: createAppointmentDto.specialtyId,
        reason: createAppointmentDto.reason,
        startAppointment: startDate,
        endAppointment: endDate,
        status: StatusAppointment.PENDING,
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true } },
      },
    });

    return this.mapToAppointmentResponse(appointment);
  }

  async findAll(
    doctorId: string,
    page: number,
    limit: number,
    startDate?: string,
    endDate?: string,
    status?: StatusAppointment,
  ): Promise<PaginationResponseDto<AppointmentResponseDto>> {
    const skip = (page - 1) * limit;

    const where: {
      doctorId: string;
      startAppointment?: { gte?: Date; lte?: Date };
      status?: StatusAppointment;
    } = { doctorId };

    if (startDate || endDate) {
      where.startAppointment = {};
      if (startDate) {
        where.startAppointment.gte = new Date(startDate);
      }
      if (endDate) {
        where.startAppointment.lte = new Date(endDate);
      }
    }

    if (status !== undefined && status !== null) {
      where.status = status;
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true, specialty: true } },
        },
        orderBy: { startAppointment: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: appointments.map((appointment) =>
        this.mapToAppointmentResponse(appointment),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string, doctorId: string): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('appointment-not-found');
    }

    if (appointment.doctorId !== doctorId) {
      throw new ForbiddenException('appointment-not-owned-by-doctor');
    }

    return this.mapToAppointmentResponse(appointment);
  }

  async update(
    id: string,
    updateAppointmentDto: UpdateAppointmentDto,
    doctorId: string,
  ): Promise<AppointmentResponseDto> {
    const existingAppointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      throw new NotFoundException('appointment-not-found');
    }

    if (existingAppointment.doctorId !== doctorId) {
      throw new ForbiddenException('appointment-not-owned-by-doctor');
    }

    if (
      updateAppointmentDto.startAppointment ||
      updateAppointmentDto.endAppointment
    ) {
      const startDate = updateAppointmentDto.startAppointment
        ? new Date(updateAppointmentDto.startAppointment)
        : existingAppointment.startAppointment;
      const endDate = updateAppointmentDto.endAppointment
        ? new Date(updateAppointmentDto.endAppointment)
        : existingAppointment.endAppointment;

      if (startDate >= endDate) {
        throw new BadRequestException('invalid-date-range');
      }

      const conflictingAppointment = await this.prisma.appointment.findFirst({
        where: {
          id: { not: id },
          doctorId: existingAppointment.doctorId,
          status: {
            in: [StatusAppointment.PENDING, StatusAppointment.CONFIRMED],
          },
          OR: [
            {
              startAppointment: { lte: startDate },
              endAppointment: { gt: startDate },
            },
            {
              startAppointment: { lt: endDate },
              endAppointment: { gte: endDate },
            },
            {
              startAppointment: { gte: startDate },
              endAppointment: { lte: endDate },
            },
          ],
        },
      });

      if (conflictingAppointment) {
        throw new ConflictException('appointment-conflict');
      }
    }

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        startAppointment: updateAppointmentDto.startAppointment
          ? new Date(updateAppointmentDto.startAppointment)
          : undefined,
        endAppointment: updateAppointmentDto.endAppointment
          ? new Date(updateAppointmentDto.endAppointment)
          : undefined,
        status: updateAppointmentDto.status,
        reason: updateAppointmentDto.reason,
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true } },
      },
    });

    return this.mapToAppointmentResponse(appointment);
  }

  async cancel(id: string, doctorId: string): Promise<AppointmentResponseDto> {
    const existingAppointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      throw new NotFoundException('appointment-not-found');
    }

    if (existingAppointment.doctorId !== doctorId) {
      throw new ForbiddenException('appointment-not-owned-by-doctor');
    }

    const appointmentStatus = existingAppointment.status as StatusAppointment;

    if (appointmentStatus === StatusAppointment.CANCELLED) {
      throw new BadRequestException('appointment-already-cancelled');
    }

    if (appointmentStatus === StatusAppointment.COMPLETED) {
      throw new BadRequestException('appointment-cannot-cancel-completed');
    }

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: { status: StatusAppointment.CANCELLED },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true } },
      },
    });

    return this.mapToAppointmentResponse(appointment);
  }

  async findByPatient(
    patientId: string,
    doctorId: string,
  ): Promise<AppointmentResponseDto[]> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('patient-not-found');
    }

    const appointments = await this.prisma.appointment.findMany({
      where: { patientId, doctorId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true } },
      },
      orderBy: { startAppointment: 'desc' },
    });

    return appointments.map((appointment) =>
      this.mapToAppointmentResponse(appointment),
    );
  }

  async findTodaysByDoctor(
    doctorId: string,
    date?: string,
  ): Promise<AppointmentResponseDto[]> {
    const ref = date ? new Date(date) : new Date();
    const startOfDay = new Date(ref);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(ref);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        startAppointment: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true } },
      },
      orderBy: { startAppointment: 'asc' },
    });

    return appointments.map((appointment) =>
      this.mapToAppointmentResponse(appointment),
    );
  }

  private mapToAppointmentResponse(appointment: {
    id: string;
    patientId: string;
    doctorId: string;
    specialtyId: string;
    startAppointment: Date;
    endAppointment: Date;
    reason: string | null;
    status: string;
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
  }): AppointmentResponseDto {
    const patient: AppointmentPatientDto = {
      id: appointment.patient.id,
      name: appointment.patient.user.name,
      lastName: appointment.patient.user.lastName,
    };

    const doctor: AppointmentDoctorDto = {
      id: appointment.doctor.id,
      name: appointment.doctor.user.name,
      lastName: appointment.doctor.user.lastName,
      specialty: appointment.doctor.specialty.name,
    };

    return {
      id: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      specialtyId: appointment.specialtyId,
      startAppointment: appointment.startAppointment,
      endAppointment: appointment.endAppointment,
      reason: appointment.reason ?? '',
      status: appointment.status as StatusAppointment,
      patient,
      doctor,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}
