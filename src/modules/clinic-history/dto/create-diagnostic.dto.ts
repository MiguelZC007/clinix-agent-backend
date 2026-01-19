import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateDiagnosticDto {
  @ApiProperty({
    description: 'Nombre del diagnóstico',
    example: 'Hipertensión arterial',
  })
  @IsNotEmpty({ message: 'El nombre del diagnóstico es requerido' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Descripción detallada del diagnóstico',
    example: 'Presión arterial elevada de forma crónica',
  })
  @IsNotEmpty({ message: 'La descripción del diagnóstico es requerida' })
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres' })
  description: string;
}
