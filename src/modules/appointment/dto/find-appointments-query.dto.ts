import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsDateString } from 'class-validator';
import { PaginationQueryDto } from 'src/core/dto/pagination-query.dto';

export class FindAppointmentsQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Fecha de inicio para filtrar citas (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Fecha de fin para filtrar citas (ISO 8601)',
    example: '2026-01-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
