import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsUUID,
  IsOptional,
  IsInt,
  ValidateNested,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  IsNotEmpty,
  ValidateIf,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Transform, Type, TransformFnParams } from 'class-transformer';
import { CreateDiagnosticDto } from './create-diagnostic.dto';
import { CreatePhysicalExamDto } from './create-physical-exam.dto';
import { CreateVitalSignDto } from './create-vital-sign.dto';
import { CreatePrescriptionDto } from './create-prescription.dto';

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

@ValidatorConstraint({ name: 'patientIdentifierPair', async: false })
class PatientIdentifierPairConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as CreateClinicHistoryWithoutAppointmentDto;
    const hasIds =
      obj.patientId != null &&
      String(obj.patientId).trim() !== '' &&
      obj.specialtyId != null &&
      String(obj.specialtyId).trim() !== '';
    const hasNumbers =
      isInteger(obj.patientNumber) && isInteger(obj.specialtyCode);
    if (hasIds && hasNumbers) return false;
    if (!hasIds && !hasNumbers) return false;
    return true;
  }

  defaultMessage(): string {
    return 'Debe enviar (patientId y specialtyId) o (patientNumber y specialtyCode), no mezclar ni omitir una pareja completa.';
  }
}

export class CreateClinicHistoryWithoutAppointmentDto {
  @ApiProperty({
    description:
      'ID del paciente (UUID). Requerido si no se envían patientNumber y specialtyCode.',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @ValidateIf((o) => !isInteger(o.patientNumber) || !isInteger(o.specialtyCode))
  @IsNotEmpty({ message: 'El ID del paciente es requerido' })
  @IsUUID('4', { message: 'El ID del paciente debe ser un UUID válido' })
  patientId?: string;

  @ApiProperty({
    description:
      'ID de la especialidad (UUID). Requerido si no se envían patientNumber y specialtyCode.',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  @ValidateIf((o) => !isInteger(o.patientNumber) || !isInteger(o.specialtyCode))
  @IsNotEmpty({ message: 'El ID de la especialidad es requerido' })
  @IsUUID('4', { message: 'El ID de la especialidad debe ser un UUID válido' })
  specialtyId?: string;

  @ApiProperty({
    description:
      'Número único del paciente. Debe enviarse junto con specialtyCode (alternativa a patientId y specialtyId).',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'patientNumber debe ser un entero' })
  patientNumber?: number;

  @ApiProperty({
    description:
      'Código único de la especialidad. Debe enviarse junto con patientNumber (alternativa a patientId y specialtyId).',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'specialtyCode debe ser un entero' })
  @Validate(PatientIdentifierPairConstraint)
  specialtyCode?: number;

  @ApiProperty({
    description: 'Motivo de la consulta',
    example: 'Dolor de cabeza persistente desde hace 3 días',
  })
  @IsNotEmpty({ message: 'El motivo de consulta es requerido' })
  @IsString({ message: 'El motivo de consulta debe ser texto' })
  @MinLength(10, {
    message: 'El motivo de consulta debe tener al menos 10 caracteres',
  })
  @MaxLength(1000, {
    message: 'El motivo de consulta no puede exceder 1000 caracteres',
  })
  @Transform(({ obj, value }: TransformFnParams): string => {
    if (typeof value === 'string') return value;
    const legacyReason = (obj as { reason?: unknown }).reason;
    return typeof legacyReason === 'string' ? legacyReason : '';
  })
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
  @Transform(({ value }: TransformFnParams): unknown => {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      return [value];
    }
    return value;
  })
  symptoms: string[];

  @ApiProperty({
    description: 'Tratamiento indicado',
    example: 'Reposo, hidratación y medicamento para el dolor',
  })
  @IsNotEmpty({ message: 'El tratamiento es requerido' })
  @IsString({ message: 'El tratamiento debe ser texto' })
  @MinLength(10, {
    message: 'El tratamiento debe tener al menos 10 caracteres',
  })
  @MaxLength(2000, {
    message: 'El tratamiento no puede exceder 2000 caracteres',
  })
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
