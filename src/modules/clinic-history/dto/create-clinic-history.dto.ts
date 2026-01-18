import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsUUID,
  IsOptional,
  ValidateNested,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDiagnosticDto } from './create-diagnostic.dto';
import { CreatePhysicalExamDto } from './create-physical-exam.dto';
import { CreateVitalSignDto } from './create-vital-sign.dto';
import { CreatePrescriptionDto } from './create-prescription.dto';

export class CreateClinicHistoryDto {
  @ApiProperty({
    description: 'ID de la cita médica asociada',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsUUID()
  appointmentId: string;

  @ApiProperty({
    description: 'Motivo de la consulta',
    example: 'Dolor de cabeza persistente desde hace 3 días',
  })
  @IsString()
  @MinLength(10)
  consultationReason: string;

  @ApiProperty({
    description: 'Lista de síntomas del paciente',
    example: ['dolor de cabeza', 'mareos', 'náuseas'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  symptoms: string[];

  @ApiProperty({
    description: 'Tratamiento indicado',
    example: 'Reposo, hidratación y medicamento para el dolor',
  })
  @IsString()
  @MinLength(10)
  treatment: string;

  @ApiProperty({
    description: 'Lista de diagnósticos',
    type: [CreateDiagnosticDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDiagnosticDto)
  diagnostics: CreateDiagnosticDto[];

  @ApiProperty({
    description: 'Lista de exámenes físicos realizados',
    type: [CreatePhysicalExamDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePhysicalExamDto)
  physicalExams: CreatePhysicalExamDto[];

  @ApiProperty({
    description: 'Lista de signos vitales registrados',
    type: [CreateVitalSignDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVitalSignDto)
  vitalSigns: CreateVitalSignDto[];

  @ApiProperty({
    description: 'Receta médica (opcional)',
    type: CreatePrescriptionDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePrescriptionDto)
  prescription?: CreatePrescriptionDto;
}
