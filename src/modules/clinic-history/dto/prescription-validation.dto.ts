import { ApiProperty } from '@nestjs/swagger';

export enum PrescriptionConflictType {
  ALLERGY = 'ALLERGY',
  MEDICATION = 'MEDICATION',
}

export class PrescriptionConflict {
  @ApiProperty({
    description: 'Nombre del medicamento prescrito',
    example: 'Penicilina V',
  })
  medication: string;

  @ApiProperty({
    description: 'La alergia o medicamento del paciente con el que coincided',
    example: 'penicilina',
  })
  matchedAgainst: string;

  @ApiProperty({
    description: 'Tipo de conflicto',
    enum: PrescriptionConflictType,
    example: PrescriptionConflictType.ALLERGY,
  })
  type: PrescriptionConflictType;
}

export interface PrescriptionValidationResult {
  blockingErrors: PrescriptionConflict[];
  warnings: PrescriptionConflict[];
}
