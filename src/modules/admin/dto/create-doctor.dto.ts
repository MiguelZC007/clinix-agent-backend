import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
  IsUUID,
} from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty({
    description: 'Correo electrónico del doctor',
    example: 'doctor@ejemplo.com',
  })
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  email: string;

  @ApiProperty({
    description: 'Nombre del doctor',
    example: 'Carlos',
  })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Apellido del doctor',
    example: 'García',
  })
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @IsString({ message: 'El apellido debe ser texto' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres' })
  lastName: string;

  @ApiProperty({
    description: 'Teléfono del doctor (formato internacional)',
    example: '+584241234567',
  })
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @IsString({ message: 'El teléfono debe ser texto' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'El teléfono debe tener un formato válido (ej: +584241234567)',
  })
  phone: string;

  @ApiProperty({
    description: 'Contraseña del doctor',
    example: 'password123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede exceder 100 caracteres' })
  password?: string;

  @ApiProperty({
    description: 'ID de la especialidad del doctor',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'La especialidad es requerida' })
  @IsUUID('4', { message: 'La especialidad debe ser un UUID válido' })
  specialtyId: string;

  @ApiProperty({
    description: 'Número de licencia médica',
    example: 'MP-12345',
  })
  @IsNotEmpty({ message: 'El número de licencia es requerido' })
  @IsString({ message: 'El número de licencia debe ser texto' })
  @MinLength(2, {
    message: 'El número de licencia debe tener al menos 2 caracteres',
  })
  @MaxLength(50, {
    message: 'El número de licencia no puede exceder 50 caracteres',
  })
  licenseNumber: string;
}
