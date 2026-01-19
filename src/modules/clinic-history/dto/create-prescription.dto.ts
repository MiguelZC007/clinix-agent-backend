import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePrescriptionMedicationDto } from './create-prescription-medication.dto';

export class CreatePrescriptionDto {
  @ApiProperty({
    description: 'Nombre o título de la receta',
    example: 'Receta para tratamiento de hipertensión',
  })
  @IsNotEmpty({ message: 'El nombre de la receta es requerido' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Descripción general de la receta',
    example: 'Tratamiento antihipertensivo de mantenimiento',
  })
  @IsNotEmpty({ message: 'La descripción de la receta es requerida' })
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description: string;

  @ApiProperty({
    description: 'Lista de medicamentos de la receta',
    type: [CreatePrescriptionMedicationDto],
  })
  @IsArray({ message: 'Los medicamentos deben ser un arreglo' })
  @ArrayMinSize(1, { message: 'La receta debe incluir al menos un medicamento' })
  @ArrayMaxSize(30, { message: 'La receta no puede incluir más de 30 medicamentos' })
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionMedicationDto)
  medications: CreatePrescriptionMedicationDto[];
}
