import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class CreatePhysicalExamDto {
  @ApiProperty({
    description: 'Nombre del examen físico',
    example: 'Auscultación pulmonar',
  })
  @IsNotEmpty({ message: 'El nombre del examen es requerido' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Descripción o hallazgos del examen',
    example: 'Murmullo vesicular presente, sin ruidos agregados',
  })
  @IsNotEmpty({ message: 'La descripción del examen es requerida' })
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres' })
  description: string;
}
