import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookMessageDto {
  @ApiProperty({
    description: 'SID único del mensaje',
    example: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  })
  @IsString()
  MessageSid: string;

  @ApiProperty({
    description: 'SID de la cuenta de Twilio',
    example: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  })
  @IsString()
  AccountSid: string;

  @ApiProperty({
    description: 'Número de teléfono que envía el mensaje',
    example: 'whatsapp:+1234567890'
  })
  @IsString()
  From: string;

  @ApiProperty({
    description: 'Número de teléfono que recibe el mensaje',
    example: 'whatsapp:+14155238886'
  })
  @IsString()
  To: string;

  @ApiProperty({
    description: 'Contenido del mensaje',
    example: 'Hola, este es un mensaje recibido'
  })
  @IsString()
  Body: string;

  @ApiPropertyOptional({
    description: 'Número de archivos multimedia adjuntos',
    example: 0
  })
  @IsOptional()
  @IsNumber()
  NumMedia?: number;

  @ApiPropertyOptional({
    description: 'URL del archivo multimedia (si existe)',
    example: 'https://api.twilio.com/2010-04-01/Accounts/.../Messages/.../Media/...'
  })
  @IsOptional()
  @IsString()
  MediaUrl0?: string;

  @ApiPropertyOptional({
    description: 'Tipo de contenido del archivo multimedia',
    example: 'image/jpeg'
  })
  @IsOptional()
  @IsString()
  MediaContentType0?: string;

  @ApiPropertyOptional({
    description: 'Estado del mensaje',
    example: 'received'
  })
  @IsOptional()
  @IsString()
  SmsStatus?: string;

  @ApiPropertyOptional({
    description: 'Timestamp del mensaje',
    example: '2024-01-04T14:30:00Z'
  })
  @IsOptional()
  @IsString()
  Timestamp?: string;
}
