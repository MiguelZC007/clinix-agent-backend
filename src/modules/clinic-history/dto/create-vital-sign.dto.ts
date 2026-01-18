import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateVitalSignDto {
  @ApiProperty({
    description: 'Nombre del signo vital',
    example: 'Presión arterial',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Valor del signo vital',
    example: '120/80',
  })
  @IsString()
  value: string;

  @ApiProperty({
    description: 'Unidad de medida',
    example: 'mmHg',
  })
  @IsString()
  unit: string;

  @ApiProperty({
    description: 'Tipo de medición',
    example: 'sistólica/diastólica',
  })
  @IsString()
  measurement: string;

  @ApiProperty({
    description: 'Descripción adicional',
    example: 'Medición en reposo',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
