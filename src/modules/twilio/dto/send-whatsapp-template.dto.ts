import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { E164_REGEX } from '../validators/phone.validator';

export class SendWhatsAppTemplateDto {
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
    description:
      'Content SID de la plantilla aprobada por WhatsApp (ej: HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)',
    example: 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  contentSid: string;

  @ApiPropertyOptional({
    description:
      'Variables de la plantilla como objeto clave-valor (ej: { "1": "Juan" })',
    example: { '1': 'Juan', '2': 'recordatorio' },
  })
  @IsOptional()
  @IsObject()
  contentVariables?: Record<string, string>;
}
