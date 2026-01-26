import { ApiProperty } from '@nestjs/swagger';

export class DiagnosticResponseDto {
  @ApiProperty({
    description: 'ID único del diagnóstico',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del diagnóstico',
    example: 'Hipertensión arterial',
  })
  name: string;

  @ApiProperty({
    description: 'Descripción del diagnóstico',
    example: 'Presión arterial elevada de forma crónica',
  })
  description: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2026-01-18T10:30:00.000Z',
  })
  createdAt: Date;
}

export class PhysicalExamResponseDto {
  @ApiProperty({
    description: 'ID único del examen físico',
    example: '550e8400-e29b-41d4-a716-446655440011',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del examen físico',
    example: 'Auscultación pulmonar',
  })
  name: string;

  @ApiProperty({
    description: 'Descripción o hallazgos',
    example: 'Murmullo vesicular presente, sin ruidos agregados',
  })
  description: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2026-01-18T10:30:00.000Z',
  })
  createdAt: Date;
}

export class VitalSignResponseDto {
  @ApiProperty({
    description: 'ID único del signo vital',
    example: '550e8400-e29b-41d4-a716-446655440012',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del signo vital',
    example: 'Presión arterial',
  })
  name: string;

  @ApiProperty({
    description: 'Valor del signo vital',
    example: '120/80',
  })
  value: string;

  @ApiProperty({
    description: 'Unidad de medida',
    example: 'mmHg',
  })
  unit: string;

  @ApiProperty({
    description: 'Tipo de medición',
    example: 'sistólica/diastólica',
  })
  measurement: string;

  @ApiProperty({
    description: 'Descripción adicional',
    example: 'Medición en reposo',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2026-01-18T10:30:00.000Z',
  })
  createdAt: Date;
}

export class PrescriptionMedicationResponseDto {
  @ApiProperty({
    description: 'ID único del medicamento',
    example: '550e8400-e29b-41d4-a716-446655440013',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del medicamento',
    example: 'Losartán',
  })
  name: string;

  @ApiProperty({
    description: 'Cantidad del medicamento',
    example: 30,
  })
  quantity: number;

  @ApiProperty({
    description: 'Unidad del medicamento',
    example: 'tabletas',
  })
  unit: string;

  @ApiProperty({
    description: 'Frecuencia de administración',
    example: 'Cada 12 horas',
  })
  frequency: string;

  @ApiProperty({
    description: 'Duración del tratamiento',
    example: '30 días',
  })
  duration: string;

  @ApiProperty({
    description: 'Indicaciones de uso',
    example: 'Tomar con alimentos',
  })
  indications: string;

  @ApiProperty({
    description: 'Vía de administración',
    example: 'Oral',
  })
  administrationRoute: string;

  @ApiProperty({
    description: 'Descripción adicional',
    example: '50mg por tableta',
    required: false,
  })
  description?: string;
}

export class PrescriptionResponseDto {
  @ApiProperty({
    description: 'ID único de la receta',
    example: '550e8400-e29b-41d4-a716-446655440014',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre de la receta',
    example: 'Receta para tratamiento de hipertensión',
  })
  name: string;

  @ApiProperty({
    description: 'Descripción de la receta',
    example: 'Tratamiento antihipertensivo de mantenimiento',
  })
  description: string;

  @ApiProperty({
    description: 'Lista de medicamentos',
    type: [PrescriptionMedicationResponseDto],
  })
  medications: PrescriptionMedicationResponseDto[];

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2026-01-18T10:30:00.000Z',
  })
  createdAt: Date;
}

export class ClinicHistoryPatientDto {
  @ApiProperty({
    description: 'ID del paciente',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del paciente',
    example: 'Juan',
  })
  name: string;

  @ApiProperty({
    description: 'Apellido del paciente',
    example: 'Pérez',
  })
  lastName: string;
}

export class ClinicHistoryDoctorDto {
  @ApiProperty({
    description: 'ID del doctor',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del doctor',
    example: 'María',
  })
  name: string;

  @ApiProperty({
    description: 'Apellido del doctor',
    example: 'González',
  })
  lastName: string;

  @ApiProperty({
    description: 'Especialidad del doctor',
    example: 'Cardiología',
  })
  specialty: string;
}

export class ClinicHistoryResponseDto {
  @ApiProperty({
    description: 'ID único de la historia clínica',
    example: '550e8400-e29b-41d4-a716-446655440015',
  })
  id: string;

  @ApiProperty({
    description: 'ID del paciente',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  patientId: string;

  @ApiProperty({
    description: 'ID del doctor',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  doctorId: string;

  @ApiProperty({
    description: 'ID de la especialidad',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  specialtyId: string;

  @ApiProperty({
    description: 'ID de la cita asociada',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  appointmentId: string;

  @ApiProperty({
    description: 'Motivo de la consulta',
    example: 'Dolor de cabeza persistente desde hace 3 días',
  })
  consultationReason: string;

  @ApiProperty({
    description: 'Lista de síntomas',
    example: ['dolor de cabeza', 'mareos', 'náuseas'],
    type: [String],
  })
  symptoms: string[];

  @ApiProperty({
    description: 'Tratamiento indicado',
    example: 'Reposo, hidratación y medicamento para el dolor',
  })
  treatment: string;

  @ApiProperty({
    description: 'Lista de diagnósticos',
    type: [DiagnosticResponseDto],
  })
  diagnostics: DiagnosticResponseDto[];

  @ApiProperty({
    description: 'Lista de exámenes físicos',
    type: [PhysicalExamResponseDto],
  })
  physicalExams: PhysicalExamResponseDto[];

  @ApiProperty({
    description: 'Lista de signos vitales',
    type: [VitalSignResponseDto],
  })
  vitalSigns: VitalSignResponseDto[];

  @ApiProperty({
    description: 'Receta médica',
    type: PrescriptionResponseDto,
    required: false,
  })
  prescription?: PrescriptionResponseDto;

  @ApiProperty({
    description: 'Información del paciente',
    type: ClinicHistoryPatientDto,
  })
  patient: ClinicHistoryPatientDto;

  @ApiProperty({
    description: 'Información del doctor',
    type: ClinicHistoryDoctorDto,
  })
  doctor: ClinicHistoryDoctorDto;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2026-01-18T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2026-01-18T10:30:00.000Z',
  })
  updatedAt: Date;
}
