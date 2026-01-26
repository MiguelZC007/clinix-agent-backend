import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'ID de la conversación',
    example: '550e8400-e29b-41d4-a716-446655440111',
  })
  @IsNotEmpty({ message: 'conversationId es requerido' })
  @IsUUID('4', { message: 'conversationId debe ser un UUID válido' })
  conversationId: string;

  @ApiProperty({
    description: 'Rol del mensaje',
    example: 'user',
    enum: ['user', 'assistant'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'role debe ser texto' })
  @IsIn(['user', 'assistant'], { message: 'role debe ser user o assistant' })
  role?: 'user' | 'assistant';

  @ApiProperty({
    description: 'Contenido del mensaje',
    example: 'Necesito registrar un paciente',
  })
  @IsNotEmpty({ message: 'content es requerido' })
  @IsString({ message: 'content debe ser texto' })
  @MaxLength(5000, { message: 'content no puede exceder 5000 caracteres' })
  content: string;
}

