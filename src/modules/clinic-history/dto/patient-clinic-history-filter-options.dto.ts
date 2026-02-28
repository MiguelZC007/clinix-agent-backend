import { ApiProperty } from '@nestjs/swagger';

export class ClinicHistoryFilterOptionDoctorDto {
  @ApiProperty({ description: 'ID del doctor', example: '550e8400-e29b-41d4-a716-446655440001' })
  id: string;

  @ApiProperty({ description: 'Nombre del doctor', example: 'María' })
  name: string;

  @ApiProperty({ description: 'Apellido del doctor', example: 'González' })
  lastName: string;
}

export class ClinicHistoryFilterOptionSpecialtyDto {
  @ApiProperty({ description: 'ID de la especialidad', example: '550e8400-e29b-41d4-a716-446655440002' })
  id: string;

  @ApiProperty({ description: 'Nombre de la especialidad', example: 'Cardiología' })
  name: string;
}

export class PatientClinicHistoryFilterOptionsDto {
  @ApiProperty({
    description: 'Doctores que han atendido al paciente',
    type: [ClinicHistoryFilterOptionDoctorDto],
  })
  doctors: ClinicHistoryFilterOptionDoctorDto[];

  @ApiProperty({
    description: 'Especialidades presentes en las historias del paciente',
    type: [ClinicHistoryFilterOptionSpecialtyDto],
  })
  specialties: ClinicHistoryFilterOptionSpecialtyDto[];
}
