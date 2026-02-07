import { ApiProperty } from '@nestjs/swagger';

export class SpecialtyItemDto {
  @ApiProperty({ description: 'ID de la especialidad', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ description: 'Nombre de la especialidad', example: 'Cardiología' })
  name: string;
}
