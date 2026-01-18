import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreatePhysicalExamDto {
  @ApiProperty({
    description: 'Nombre del examen físico',
    example: 'Auscultación pulmonar',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Descripción o hallazgos del examen',
    example: 'Murmullo vesicular presente, sin ruidos agregados',
  })
  @IsString()
  description: string;
}
