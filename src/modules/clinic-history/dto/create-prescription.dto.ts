import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested, MinLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePrescriptionMedicationDto } from './create-prescription-medication.dto';

export class CreatePrescriptionDto {
  @ApiProperty({
    description: 'Nombre o título de la receta',
    example: 'Receta para tratamiento de hipertensión',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Descripción general de la receta',
    example: 'Tratamiento antihipertensivo de mantenimiento',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Lista de medicamentos de la receta',
    type: [CreatePrescriptionMedicationDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionMedicationDto)
  medications: CreatePrescriptionMedicationDto[];
}
