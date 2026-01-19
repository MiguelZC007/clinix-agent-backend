import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Gender } from 'src/core/enum/gender.enum';

export class CreatePatientDto {
  @ApiProperty({
    description: 'Correo electrónico del paciente',
    example: 'paciente@ejemplo.com',
  })
  @IsNotEmpty({ message: 'El email es requerido' })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  email: string;

  @ApiProperty({
    description: 'Nombre del paciente',
    example: 'Juan',
  })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Apellido del paciente',
    example: 'Pérez',
  })
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @IsString({ message: 'El apellido debe ser texto' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres' })
  lastName: string;

  @ApiProperty({
    description: 'Teléfono del paciente (formato internacional)',
    example: '+584241234567',
  })
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @IsString({ message: 'El teléfono debe ser texto' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'El teléfono debe tener un formato válido (ej: +584241234567)',
  })
  phone: string;

  @ApiProperty({
    description: 'Contraseña del paciente',
    example: 'password123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede exceder 100 caracteres' })
  password?: string;

  @ApiProperty({
    description: 'Género del paciente',
    example: 'male',
    enum: Gender,
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender, { message: 'El género debe ser male o female' })
  gender?: Gender;

  @ApiProperty({
    description: 'Fecha de nacimiento del paciente',
    example: '1990-05-15',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de nacimiento debe tener formato ISO 8601' })
  birthDate?: string;
}
