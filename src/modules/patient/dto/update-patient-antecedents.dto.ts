import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ArrayMaxSize } from 'class-validator';

export class UpdatePatientAntecedentsDto {
  @ApiProperty({
    description: 'Lista de alergias del paciente',
    example: ['penicilina', 'maní'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Las alergias deben ser un arreglo' })
  @IsString({ each: true, message: 'Cada alergia debe ser texto' })
  @ArrayMaxSize(50, { message: 'No puede tener más de 50 alergias' })
  allergies?: string[];

  @ApiProperty({
    description: 'Lista de medicamentos actuales del paciente',
    example: ['aspirina', 'metformina'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Los medicamentos deben ser un arreglo' })
  @IsString({ each: true, message: 'Cada medicamento debe ser texto' })
  @ArrayMaxSize(50, { message: 'No puede tener más de 50 medicamentos' })
  medications?: string[];

  @ApiProperty({
    description: 'Historial médico del paciente',
    example: ['diabetes tipo 2', 'hipertensión'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'El historial médico debe ser un arreglo' })
  @IsString({ each: true, message: 'Cada entrada del historial debe ser texto' })
  @ArrayMaxSize(100, { message: 'No puede tener más de 100 entradas en historial médico' })
  medicalHistory?: string[];

  @ApiProperty({
    description: 'Historial familiar del paciente',
    example: ['enfermedad cardíaca', 'cáncer de mama'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'El historial familiar debe ser un arreglo' })
  @IsString({ each: true, message: 'Cada entrada del historial familiar debe ser texto' })
  @ArrayMaxSize(100, { message: 'No puede tener más de 100 entradas en historial familiar' })
  familyHistory?: string[];
}
