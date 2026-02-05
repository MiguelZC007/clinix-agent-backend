import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

function toNumMedia(value: unknown): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isInteger(n) || n < 0) return undefined;
  return n;
}

export class WebhookMessageDto {
  @ApiProperty({
    description: 'SID único del mensaje',
    example: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  MessageSid: string;

  @ApiProperty({
    description: 'SID de la cuenta de Twilio',
    example: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  AccountSid: string;

  @ApiProperty({
    description: 'Número de teléfono que envía el mensaje',
    example: 'whatsapp:+1234567890',
  })
  @IsString()
  From: string;

  @ApiProperty({
    description: 'Número de teléfono que recibe el mensaje',
    example: 'whatsapp:+14155238886',
  })
  @IsString()
  To: string;

  @ApiPropertyOptional({
    description: 'Contenido del mensaje (puede faltar en mensajes solo con media)',
    example: 'Hola, este es un mensaje recibido',
  })
  @IsOptional()
  @IsString()
  Body?: string;

  @ApiPropertyOptional({
    description: 'Número de archivos multimedia adjuntos',
    example: 0,
  })
  @IsOptional()
  @Transform(({ value }) => toNumMedia(value))
  @IsInt()
  @Min(0)
  NumMedia?: number;

  @ApiPropertyOptional({
    description: 'URL del archivo multimedia (si existe)',
    example:
      'https://api.twilio.com/2010-04-01/Accounts/.../Messages/.../Media/...',
  })
  @IsOptional()
  @IsString()
  MediaUrl0?: string;

  @ApiPropertyOptional({
    description: 'Tipo de contenido del archivo multimedia',
    example: 'image/jpeg',
  })
  @IsOptional()
  @IsString()
  MediaContentType0?: string;

  @ApiPropertyOptional({
    description: 'Estado del mensaje',
    example: 'received',
  })
  @IsOptional()
  @IsString()
  SmsStatus?: string;

  @ApiPropertyOptional({
    description: 'Timestamp del mensaje',
    example: '2024-01-04T14:30:00Z',
  })
  @IsOptional()
  @IsString()
  Timestamp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  SmsMessageSid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ProfileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  MessageType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  SmsSid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  WaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  MessagingServiceSid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  NumSegments?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ReferralNumMedia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ChannelMetadata?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ApiVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ErrorUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ErrorCode?: string;
}
