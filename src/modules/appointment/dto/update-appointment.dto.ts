import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { StatusAppointment } from 'src/core/enum/statusAppointment.enum';

export class UpdateAppointmentDto {
  @ApiProperty({
    description: 'Fecha y hora de inicio de la cita (ISO 8601)',
    example: '2026-01-20T09:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de inicio debe tener formato ISO 8601' },
  )
  startAppointment?: string;

  @ApiProperty({
    description: 'Fecha y hora de fin de la cita (ISO 8601)',
    example: '2026-01-20T09:30:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe tener formato ISO 8601' })
  endAppointment?: string;

  @ApiProperty({
    description: 'Estado de la cita',
    example: 'CONFIRMED',
    enum: StatusAppointment,
    required: false,
  })
  @IsOptional()
  @IsEnum(StatusAppointment, {
    message: 'El estado debe ser PENDING, CONFIRMED, CANCELLED o COMPLETED',
  })
  status?: StatusAppointment;

  @ApiProperty({
    description: 'Motivo de la cita',
    example: 'Control de seguimiento',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El motivo debe ser texto' })
  @MinLength(3, { message: 'El motivo debe tener al menos 3 caracteres' })
  @MaxLength(500, { message: 'El motivo no puede exceder 500 caracteres' })
  reason?: string;
}
