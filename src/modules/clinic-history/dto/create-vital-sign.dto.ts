import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateVitalSignDto {
  @ApiProperty({
    description: 'Nombre del signo vital',
    example: 'Presión arterial',
  })
  @IsNotEmpty({ message: 'El nombre del signo vital es requerido' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Valor del signo vital',
    example: '120/80',
  })
  @IsNotEmpty({ message: 'El valor del signo vital es requerido' })
  @IsString({ message: 'El valor debe ser texto' })
  @MaxLength(50, { message: 'El valor no puede exceder 50 caracteres' })
  value: string;

  @ApiProperty({
    description: 'Unidad de medida',
    example: 'mmHg',
  })
  @IsNotEmpty({ message: 'La unidad es requerida' })
  @IsString({ message: 'La unidad debe ser texto' })
  @MaxLength(50, { message: 'La unidad no puede exceder 50 caracteres' })
  unit: string;

  @ApiProperty({
    description: 'Tipo de medición',
    example: 'sistólica/diastólica',
  })
  @IsNotEmpty({ message: 'El tipo de medición es requerido' })
  @IsString({ message: 'El tipo de medición debe ser texto' })
  @MaxLength(100, {
    message: 'El tipo de medición no puede exceder 100 caracteres',
  })
  measurement: string;

  @ApiProperty({
    description: 'Descripción adicional',
    example: 'Medición en reposo',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;
}
