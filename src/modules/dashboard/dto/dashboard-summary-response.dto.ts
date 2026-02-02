import { ApiProperty } from '@nestjs/swagger';

export class RecentConsultationDto {
  @ApiProperty({ description: 'ID de la historia clínica', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Nombre del paciente' })
  patientName: string;

  @ApiProperty({ description: 'Apellido del paciente' })
  patientLastName: string;

  @ApiProperty({ description: 'Motivo de consulta' })
  consultationReason: string;

  @ApiProperty({
    description: 'Fecha de creación (ISO 8601)',
    example: '2026-01-18T10:30:00.000Z',
  })
  createdAt: string;
}

export class DashboardSummaryDto {
  @ApiProperty({
    description: 'Cantidad de pacientes distintos con al menos una cita o historia con el doctor',
  })
  patientsCount: number;

  @ApiProperty({
    description: 'Cantidad de citas del doctor en la semana actual',
  })
  appointmentsThisWeek: number;

  @ApiProperty({
    description: 'Cantidad total de historias clínicas del doctor',
  })
  totalHistories: number;

  @ApiProperty({
    description: 'Cantidad de historias clínicas creadas hoy por el doctor',
  })
  consultationsToday: number;

  @ApiProperty({
    description: 'Últimas consultas del doctor',
    type: [RecentConsultationDto],
  })
  recentConsultations: RecentConsultationDto[];
}
