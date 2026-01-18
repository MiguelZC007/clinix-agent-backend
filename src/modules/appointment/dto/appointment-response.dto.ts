import { ApiProperty } from '@nestjs/swagger';
import { StatusAppointment } from 'src/core/enum/statusAppointment.enum';

export class AppointmentPatientDto {
  @ApiProperty({
    description: 'ID del paciente',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del paciente',
    example: 'Juan',
  })
  name: string;

  @ApiProperty({
    description: 'Apellido del paciente',
    example: 'Pérez',
  })
  lastName: string;
}

export class AppointmentDoctorDto {
  @ApiProperty({
    description: 'ID del doctor',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del doctor',
    example: 'María',
  })
  name: string;

  @ApiProperty({
    description: 'Apellido del doctor',
    example: 'González',
  })
  lastName: string;

  @ApiProperty({
    description: 'Especialidad del doctor',
    example: 'Cardiología',
  })
  specialty: string;
}

export class AppointmentResponseDto {
  @ApiProperty({
    description: 'ID único de la cita',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  id: string;

  @ApiProperty({
    description: 'ID del paciente',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  patientId: string;

  @ApiProperty({
    description: 'ID del doctor',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  doctorId: string;

  @ApiProperty({
    description: 'ID de la especialidad',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  specialtyId: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio de la cita',
    example: '2026-01-20T09:00:00.000Z',
  })
  startAppointment: Date;

  @ApiProperty({
    description: 'Fecha y hora de fin de la cita',
    example: '2026-01-20T09:30:00.000Z',
  })
  endAppointment: Date;

  @ApiProperty({
    description: 'Estado de la cita',
    example: 'PENDING',
    enum: StatusAppointment,
  })
  status: StatusAppointment;

  @ApiProperty({
    description: 'Información del paciente',
    type: AppointmentPatientDto,
  })
  patient: AppointmentPatientDto;

  @ApiProperty({
    description: 'Información del doctor',
    type: AppointmentDoctorDto,
  })
  doctor: AppointmentDoctorDto;

  @ApiProperty({
    description: 'Fecha de creación del registro',
    example: '2026-01-18T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2026-01-18T10:30:00.000Z',
  })
  updatedAt: Date;
}
