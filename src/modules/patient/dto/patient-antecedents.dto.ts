import { ApiProperty } from '@nestjs/swagger';

export class PatientAntecedentsDto {
  @ApiProperty({
    description: 'ID único del paciente',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  patientId: string;

  @ApiProperty({
    description: 'Lista de alergias del paciente',
    example: ['penicilina', 'maní'],
    type: [String],
  })
  allergies: string[];

  @ApiProperty({
    description: 'Lista de medicamentos actuales del paciente',
    example: ['aspirina', 'metformina'],
    type: [String],
  })
  medications: string[];

  @ApiProperty({
    description: 'Historial médico del paciente',
    example: ['diabetes tipo 2', 'hipertensión'],
    type: [String],
  })
  medicalHistory: string[];

  @ApiProperty({
    description: 'Historial familiar del paciente',
    example: ['enfermedad cardíaca', 'cáncer de mama'],
    type: [String],
  })
  familyHistory: string[];

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2026-01-18T10:30:00.000Z',
  })
  updatedAt: Date;
}
