import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    description: 'ID del mensaje',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID de la conversación',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440111',
  })
  conversationId?: string;

  @ApiProperty({
    description: 'Rol del mensaje',
    example: 'user',
    enum: ['user', 'assistant'],
  })
  role: 'user' | 'assistant';

  @ApiProperty({
    description: 'Contenido del mensaje',
    example: 'Hola, necesito registrar un paciente',
  })
  content: string;

  @ApiProperty({ description: 'Tokens estimados', example: 42 })
  tokenCount: number;

  @ApiProperty({
    description: 'Fecha y hora de lectura',
    required: false,
    example: '2026-01-25T10:30:00.000Z',
  })
  readAt?: Date;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2026-01-25T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2026-01-25T10:30:00.000Z',
  })
  updatedAt: Date;
}

