import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min, MaxLength, IsUUID, IsDateString } from 'class-validator';

export class FindAllClinicHistoriesQueryDto {
  @ApiProperty({
    description: 'Número de página',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Cantidad de elementos por página',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiProperty({
    description: 'Búsqueda por texto (paciente, motivo, diagnóstico, tratamiento)',
    example: 'dolor',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : undefined,
  )
  @MaxLength(200)
  search?: string;

  @ApiProperty({
    description: 'Filtrar por ID de paciente',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiProperty({
    description: 'Fecha desde (ISO 8601)',
    example: '2026-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    description: 'Fecha hasta (ISO 8601)',
    example: '2026-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({
    description: 'Filtrar por ID de doctor',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiProperty({
    description: 'Filtrar por ID de especialidad',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  specialtyId?: string;
}
