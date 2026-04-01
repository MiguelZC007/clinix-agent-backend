import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateDoctorDto {
  @ApiPropertyOptional({
    description: 'Correo electrónico del doctor',
    example: 'doctor@ejemplo.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Nombre del doctor',
    example: 'Carlos',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Apellido del doctor',
    example: 'González',
  })
  @IsOptional()
  @IsString({ message: 'El apellido debe ser texto' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del doctor (formato internacional)',
    example: '+584241234567',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'El teléfono debe tener un formato válido (ej: +584241234567)',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'ID de la especialidad del doctor',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de especialidad debe ser un UUID válido' })
  specialtyId?: string;

  @ApiPropertyOptional({
    description: 'Número de licencia del doctor',
    example: 'MED-12345',
  })
  @IsOptional()
  @IsString({ message: 'El número de licencia debe ser texto' })
  licenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Contraseña del doctor',
    example: 'password123',
  })
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede exceder 100 caracteres' })
  password?: string;
}
