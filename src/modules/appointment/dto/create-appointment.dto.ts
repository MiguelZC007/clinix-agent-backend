import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsDateString } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'ID del paciente',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  patientId: string;

  @ApiProperty({
    description: 'ID del doctor',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  doctorId: string;

  @ApiProperty({
    description: 'ID de la especialidad',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  specialtyId: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio de la cita (ISO 8601)',
    example: '2026-01-20T09:00:00.000Z',
  })
  @IsDateString()
  startAppointment: string;

  @ApiProperty({
    description: 'Fecha y hora de fin de la cita (ISO 8601)',
    example: '2026-01-20T09:30:00.000Z',
  })
  @IsDateString()
  endAppointment: string;
}
