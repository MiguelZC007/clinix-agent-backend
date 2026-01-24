import { ApiProperty } from '@nestjs/swagger';
import { Gender } from 'src/core/enum/gender.enum';

export class PatientResponseDto {
  @ApiProperty({
    description: 'ID único del paciente',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Correo electrónico del paciente',
    example: 'paciente@ejemplo.com',
  })
  email: string;

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

  @ApiProperty({
    description: 'Teléfono del paciente',
    example: '+584241234567',
  })
  phone: string;

  @ApiProperty({
    description: 'Dirección del paciente',
    example: 'Calle 123, Ciudad',
    required: false,
  })
  address?: string;

  @ApiProperty({
    description: 'Género del paciente',
    example: 'male',
    enum: Gender,
    required: false,
  })
  gender?: Gender;

  @ApiProperty({
    description: 'Fecha de nacimiento del paciente',
    example: '1990-05-15T00:00:00.000Z',
    required: false,
  })
  birthDate?: Date;

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
