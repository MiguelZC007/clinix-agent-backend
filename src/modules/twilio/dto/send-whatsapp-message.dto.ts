import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { E164_REGEX } from '../validators/phone.validator';

export class SendWhatsAppMessageDto {
  @ApiProperty({
    description:
      'Número de teléfono del destinatario en formato E.164 (ej: +1234567890)',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(E164_REGEX, {
    message: 'to debe ser un número en formato E.164 (ej: +1234567890)',
  })
  to: string;

  @ApiProperty({
    description: 'Contenido del mensaje de texto',
    example: 'Hola, este es un mensaje de prueba desde WhatsApp',
  })
  @IsString()
  @IsNotEmpty()
  body: string;
}
