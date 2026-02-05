import { ApiProperty } from '@nestjs/swagger';

export class ConversationResponseDto {
  @ApiProperty({
    description: 'ID de la conversación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({ description: 'Modelo usado', example: 'gpt-4o-mini' })
  model: string;

  @ApiProperty({
    description: 'Prompt del sistema',
    example: 'Eres el asistente del médico...',
  })
  systemPrompt: string;

  @ApiProperty({
    description: 'Resumen de la conversación',
    required: false,
    example: 'Se registró a la paciente María García...',
  })
  summary?: string;

  @ApiProperty({
    description: 'Última actividad',
    example: '2026-01-25T10:30:00.000Z',
  })
  lastActivityAt: Date;

  @ApiProperty({ description: 'Indica si está activa', example: true })
  isActive: boolean;

  @ApiProperty({
    description: 'ID del doctor dueño de la conversación',
    example: '550e8400-e29b-41d4-a716-446655440111',
  })
  doctorId: string;

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

  @ApiProperty({
    description: 'Límite de mensajes recientes en el contexto del agente',
    example: 10,
    required: false,
  })
  contextMessageLimit?: number;

  @ApiProperty({
    description: 'Título sugerido para la UI (derivado de resumen o fecha)',
    example: 'Conversación 1 ene',
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: 'Texto del último mensaje para preview en lista',
    example: 'Gracias, ya quedó claro',
    required: false,
  })
  lastMessagePreview?: string;
}

