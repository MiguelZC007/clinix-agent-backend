import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdatePatientAntecedentsDto {
  @ApiProperty({
    description: 'Lista de alergias del paciente',
    example: ['penicilina', 'maní'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiProperty({
    description: 'Lista de medicamentos actuales del paciente',
    example: ['aspirina', 'metformina'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiProperty({
    description: 'Historial médico del paciente',
    example: ['diabetes tipo 2', 'hipertensión'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalHistory?: string[];

  @ApiProperty({
    description: 'Historial familiar del paciente',
    example: ['enfermedad cardíaca', 'cáncer de mama'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  familyHistory?: string[];
}
