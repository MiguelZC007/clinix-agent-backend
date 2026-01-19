import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsUUID,
  IsOptional,
  ValidateNested,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  IsNotEmpty,
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
  @IsNotEmpty({ message: 'El ID de la cita es requerido' })
  @IsUUID('4', { message: 'El ID de la cita debe ser un UUID válido' })
  appointmentId: string;

  @ApiProperty({
    description: 'Motivo de la consulta',
    example: 'Dolor de cabeza persistente desde hace 3 días',
  })
  @IsNotEmpty({ message: 'El motivo de consulta es requerido' })
  @IsString({ message: 'El motivo de consulta debe ser texto' })
  @MinLength(10, { message: 'El motivo de consulta debe tener al menos 10 caracteres' })
  @MaxLength(1000, { message: 'El motivo de consulta no puede exceder 1000 caracteres' })
  consultationReason: string;

  @ApiProperty({
    description: 'Lista de síntomas del paciente',
    example: ['dolor de cabeza', 'mareos', 'náuseas'],
    type: [String],
  })
  @IsArray({ message: 'Los síntomas deben ser un arreglo' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un síntoma' })
  @ArrayMaxSize(50, { message: 'No puede incluir más de 50 síntomas' })
  @IsString({ each: true, message: 'Cada síntoma debe ser texto' })
  symptoms: string[];

  @ApiProperty({
    description: 'Tratamiento indicado',
    example: 'Reposo, hidratación y medicamento para el dolor',
  })
  @IsNotEmpty({ message: 'El tratamiento es requerido' })
  @IsString({ message: 'El tratamiento debe ser texto' })
  @MinLength(10, { message: 'El tratamiento debe tener al menos 10 caracteres' })
  @MaxLength(2000, { message: 'El tratamiento no puede exceder 2000 caracteres' })
  treatment: string;

  @ApiProperty({
    description: 'Lista de diagnósticos',
    type: [CreateDiagnosticDto],
  })
  @IsArray({ message: 'Los diagnósticos deben ser un arreglo' })
  @ArrayMaxSize(20, { message: 'No puede incluir más de 20 diagnósticos' })
  @ValidateNested({ each: true })
  @Type(() => CreateDiagnosticDto)
  diagnostics: CreateDiagnosticDto[];

  @ApiProperty({
    description: 'Lista de exámenes físicos realizados',
    type: [CreatePhysicalExamDto],
  })
  @IsArray({ message: 'Los exámenes físicos deben ser un arreglo' })
  @ArrayMaxSize(30, { message: 'No puede incluir más de 30 exámenes físicos' })
  @ValidateNested({ each: true })
  @Type(() => CreatePhysicalExamDto)
  physicalExams: CreatePhysicalExamDto[];

  @ApiProperty({
    description: 'Lista de signos vitales registrados',
    type: [CreateVitalSignDto],
  })
  @IsArray({ message: 'Los signos vitales deben ser un arreglo' })
  @ArrayMaxSize(20, { message: 'No puede incluir más de 20 signos vitales' })
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
