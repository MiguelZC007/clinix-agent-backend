import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateDiagnosticDto {
  @ApiProperty({
    description: 'Nombre del diagnóstico',
    example: 'Hipertensión arterial',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Descripción detallada del diagnóstico',
    example: 'Presión arterial elevada de forma crónica',
  })
  @IsString()
  description: string;
}
