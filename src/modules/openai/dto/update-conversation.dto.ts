import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateConversationDto {
  @ApiProperty({
    description: 'Cantidad de mensajes recientes a incluir en el contexto del agente',
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'contextMessageLimit debe ser un entero' })
  @Min(1, { message: 'contextMessageLimit debe ser al menos 1' })
  @Max(100, { message: 'contextMessageLimit no puede exceder 100' })
  contextMessageLimit?: number;
}
