import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

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
}
