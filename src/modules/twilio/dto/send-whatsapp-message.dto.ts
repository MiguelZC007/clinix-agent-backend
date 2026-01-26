import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendWhatsAppMessageDto {
  @ApiProperty({
    description:
      'Número de teléfono del destinatario en formato internacional (ej: +1234567890)',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    description: 'Contenido del mensaje de texto',
    example: 'Hola, este es un mensaje de prueba desde WhatsApp',
  })
  @IsString()
  @IsNotEmpty()
  body: string;
}
