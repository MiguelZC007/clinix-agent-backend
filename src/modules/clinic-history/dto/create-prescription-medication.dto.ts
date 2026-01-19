import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsNotEmpty,
  IsInt,
} from 'class-validator';

export class CreatePrescriptionMedicationDto {
  @ApiProperty({
    description: 'Nombre del medicamento',
    example: 'Losartán',
  })
  @IsNotEmpty({ message: 'El nombre del medicamento es requerido' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Cantidad del medicamento',
    example: 30,
  })
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Max(9999, { message: 'La cantidad no puede exceder 9999' })
  quantity: number;

  @ApiProperty({
    description: 'Unidad del medicamento',
    example: 'tabletas',
  })
  @IsNotEmpty({ message: 'La unidad es requerida' })
  @IsString({ message: 'La unidad debe ser texto' })
  @MaxLength(50, { message: 'La unidad no puede exceder 50 caracteres' })
  unit: string;

  @ApiProperty({
    description: 'Frecuencia de administración',
    example: 'Cada 12 horas',
  })
  @IsNotEmpty({ message: 'La frecuencia es requerida' })
  @IsString({ message: 'La frecuencia debe ser texto' })
  @MaxLength(100, { message: 'La frecuencia no puede exceder 100 caracteres' })
  frequency: string;

  @ApiProperty({
    description: 'Duración del tratamiento',
    example: '30 días',
  })
  @IsNotEmpty({ message: 'La duración es requerida' })
  @IsString({ message: 'La duración debe ser texto' })
  @MaxLength(100, { message: 'La duración no puede exceder 100 caracteres' })
  duration: string;

  @ApiProperty({
    description: 'Indicaciones de uso',
    example: 'Tomar con alimentos',
  })
  @IsNotEmpty({ message: 'Las indicaciones son requeridas' })
  @IsString({ message: 'Las indicaciones deben ser texto' })
  @MaxLength(500, { message: 'Las indicaciones no pueden exceder 500 caracteres' })
  indications: string;

  @ApiProperty({
    description: 'Vía de administración',
    example: 'Oral',
  })
  @IsNotEmpty({ message: 'La vía de administración es requerida' })
  @IsString({ message: 'La vía de administración debe ser texto' })
  @MaxLength(50, { message: 'La vía de administración no puede exceder 50 caracteres' })
  administrationRoute: string;

  @ApiProperty({
    description: 'Descripción adicional del medicamento',
    example: '50mg por tableta',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;
}
