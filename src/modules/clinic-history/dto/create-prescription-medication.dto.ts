import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, MinLength, Min } from 'class-validator';

export class CreatePrescriptionMedicationDto {
  @ApiProperty({
    description: 'Nombre del medicamento',
    example: 'Losartán',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Cantidad del medicamento',
    example: 30,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Unidad del medicamento',
    example: 'tabletas',
  })
  @IsString()
  unit: string;

  @ApiProperty({
    description: 'Frecuencia de administración',
    example: 'Cada 12 horas',
  })
  @IsString()
  frequency: string;

  @ApiProperty({
    description: 'Duración del tratamiento',
    example: '30 días',
  })
  @IsString()
  duration: string;

  @ApiProperty({
    description: 'Indicaciones de uso',
    example: 'Tomar con alimentos',
  })
  @IsString()
  indications: string;

  @ApiProperty({
    description: 'Vía de administración',
    example: 'Oral',
  })
  @IsString()
  administrationRoute: string;

  @ApiProperty({
    description: 'Descripción adicional del medicamento',
    example: '50mg por tableta',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
