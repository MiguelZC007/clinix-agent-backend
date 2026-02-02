import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'ID del paciente',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'El ID del paciente es requerido' })
  @IsUUID('4', { message: 'El ID del paciente debe ser un UUID válido' })
  patientId: string;

  @ApiProperty({
    description: 'ID de la especialidad',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsNotEmpty({ message: 'El ID de la especialidad es requerido' })
  @IsUUID('4', { message: 'El ID de la especialidad debe ser un UUID válido' })
  specialtyId: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio de la cita (ISO 8601)',
    example: '2026-01-20T09:00:00.000Z',
  })
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  @IsDateString(
    {},
    { message: 'La fecha de inicio debe tener formato ISO 8601' },
  )
  startAppointment: string;

  @ApiProperty({
    description: 'Fecha y hora de fin de la cita (ISO 8601)',
    example: '2026-01-20T09:30:00.000Z',
  })
  @IsNotEmpty({ message: 'La fecha de fin es requerida' })
  @IsDateString({}, { message: 'La fecha de fin debe tener formato ISO 8601' })
  endAppointment: string;

  @ApiProperty({
    description: 'Motivo de la cita',
    example: 'Consulta de control',
  })
  @IsNotEmpty({ message: 'El motivo de la cita es requerido' })
  @IsString({ message: 'El motivo debe ser texto' })
  @MinLength(3, { message: 'El motivo debe tener al menos 3 caracteres' })
  @MaxLength(500, { message: 'El motivo no puede exceder 500 caracteres' })
  reason: string;
}
