import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import {
  AppointmentResponseDto,
  AppointmentPatientDto,
  AppointmentDoctorDto,
} from './dto/appointment-response.dto';
import { StatusAppointment } from 'src/core/enum/statusAppointment.enum';

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAppointmentDto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: createAppointmentDto.patientId },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: createAppointmentDto.doctorId },
      include: { user: true, specialty: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor no encontrado');
    }

    const specialty = await this.prisma.specialty.findUnique({
      where: { id: createAppointmentDto.specialtyId },
    });

    if (!specialty) {
      throw new NotFoundException('Especialidad no encontrada');
    }

    const startDate = new Date(createAppointmentDto.startAppointment);
    const endDate = new Date(createAppointmentDto.endAppointment);

    if (startDate >= endDate) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }

    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId: createAppointmentDto.doctorId,
        status: { in: [StatusAppointment.PENDING, StatusAppointment.CONFIRMED] },
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
      throw new ConflictException('El doctor ya tiene una cita en este horario');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId: createAppointmentDto.patientId,
        doctorId: createAppointmentDto.doctorId,
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

  async findAll(): Promise<AppointmentResponseDto[]> {
    const appointments = await this.prisma.appointment.findMany({
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true } },
      },
      orderBy: { startAppointment: 'desc' },
    });

    return appointments.map((appointment) => this.mapToAppointmentResponse(appointment));
  }

  async findOne(id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    return this.mapToAppointmentResponse(appointment);
  }

  async update(
    id: string,
    updateAppointmentDto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const existingAppointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    if (updateAppointmentDto.startAppointment || updateAppointmentDto.endAppointment) {
      const startDate = updateAppointmentDto.startAppointment
        ? new Date(updateAppointmentDto.startAppointment)
        : existingAppointment.startAppointment;
      const endDate = updateAppointmentDto.endAppointment
        ? new Date(updateAppointmentDto.endAppointment)
        : existingAppointment.endAppointment;

      if (startDate >= endDate) {
        throw new BadRequestException(
          'La fecha de inicio debe ser anterior a la fecha de fin',
        );
      }

      const conflictingAppointment = await this.prisma.appointment.findFirst({
        where: {
          id: { not: id },
          doctorId: existingAppointment.doctorId,
          status: { in: [StatusAppointment.PENDING, StatusAppointment.CONFIRMED] },
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
        throw new ConflictException('El doctor ya tiene una cita en este horario');
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

  async cancel(id: string): Promise<AppointmentResponseDto> {
    const existingAppointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    if (existingAppointment.status === StatusAppointment.CANCELLED) {
      throw new BadRequestException('La cita ya está cancelada');
    }

    if (existingAppointment.status === StatusAppointment.COMPLETED) {
      throw new BadRequestException('No se puede cancelar una cita completada');
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

  async findByPatient(patientId: string): Promise<AppointmentResponseDto[]> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const appointments = await this.prisma.appointment.findMany({
      where: { patientId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true, specialty: true } },
      },
      orderBy: { startAppointment: 'desc' },
    });

    return appointments.map((appointment) => this.mapToAppointmentResponse(appointment));
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
