import { ApiProperty } from '@nestjs/swagger';

export class DoctorResponseDto {
  @ApiProperty({
    description: 'ID único del doctor',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

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
    example: 'González',
  })
  lastName: string;

  @ApiProperty({
    description: 'Teléfono del doctor',
    example: '+584241234567',
  })
  phone: string;

  @ApiProperty({
    description: 'Si el usuario está activo',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Número de licencia del doctor',
    example: 'MED-12345',
  })
  licenseNumber: string;

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
