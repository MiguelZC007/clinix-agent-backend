import { ApiProperty } from '@nestjs/swagger';

export class DoctorResponseDto {
  @ApiProperty({
    description: 'ID único del doctor',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID del usuario asociado',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId: string;

  @ApiProperty({
    description: 'Correo electrónico del doctor',
    example: 'doctor@ejemplo.com',
  })
  email: string;

  @ApiProperty({
    description: 'Nombre del doctor',
    example: 'Carlos',
  })
  name: string;

  @ApiProperty({
    description: 'Apellido del doctor',
    example: 'García',
  })
  lastName: string;

  @ApiProperty({
    description: 'Teléfono del doctor',
    example: '+584241234567',
  })
  phone: string;

  @ApiProperty({
    description: 'ID de la especialidad',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  specialtyId: string;

  @ApiProperty({
    description: 'Nombre de la especialidad',
    example: 'Cardiología',
  })
  specialtyName: string;

  @ApiProperty({
    description: 'Número de licencia médica',
    example: 'MP-12345',
  })
  licenseNumber: string;

  @ApiProperty({
    description: 'Si el doctor está activo',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2026-01-18T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2026-01-18T10:30:00.000Z',
  })
  updatedAt: Date;
}
