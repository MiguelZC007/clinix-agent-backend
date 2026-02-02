import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { TwilioService } from './twilio.service';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
import { SendWhatsAppTemplateDto } from './dto/send-whatsapp-template.dto';
import { WebhookMessageDto } from './dto/webhook-message.dto';
import environment from 'src/core/config/environments';
import { Public } from '../auth/decorators/public.decorator';
import { TwilioWebhookGuard } from './guards/twilio-webhook.guard';

@ApiTags('Twilio WhatsApp')
@Controller('twilio')
export class TwilioController {
  private readonly logger = new Logger(TwilioController.name);

  constructor(private readonly twilioService: TwilioService) { }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('whatsapp/send')
  @ApiOperation({
    summary: 'Enviar mensaje de WhatsApp (ventana 24h)',
    description:
      'Envía texto libre solo dentro de la ventana de 24h (respuesta a mensaje del usuario o mensaje iniciado por el sistema dentro de ventana). Usar whatsapp/send-template para mensajes proactivos fuera de 24h.',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensaje enviado exitosamente',
    schema: {
      example: {
        success: true,
        messageSid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        status: 'queued',
        to: 'whatsapp:+1234567890',
        from: 'whatsapp:+14155238886',
        body: 'Hola, este es un mensaje de prueba',
        dateCreated: '2024-01-04T14:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Error en los datos enviados' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async sendWhatsAppMessage(@Body() sendMessageDto: SendWhatsAppMessageDto) {
    return await this.twilioService.sendDirectMessage(
      sendMessageDto.to,
      sendMessageDto.body,
    );
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('whatsapp/send-template')
  @ApiOperation({
    summary: 'Enviar plantilla WhatsApp (proactivo)',
    description:
      'Envía un mensaje usando una plantilla aprobada por WhatsApp. Uso obligatorio para mensajes proactivos fuera de la ventana de 24h. No usar texto libre fuera de ventana.',
  })
  @ApiResponse({
    status: 200,
    description: 'Plantilla enviada exitosamente',
    schema: {
      example: {
        success: true,
        messageSid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        status: 'queued',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Error en los datos enviados' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async sendWhatsAppTemplate(@Body() dto: SendWhatsAppTemplateDto) {
    const fromNumber = environment.TWILIO_WHATSAPP_FROM;
    return await this.twilioService.sendProactiveTemplate(
      fromNumber,
      dto.to,
      dto.contentSid,
      dto.contentVariables,
    );
  }

  @Public()
  @UseGuards(TwilioWebhookGuard, ThrottlerGuard)
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
      getTracker: (req: Request) =>
        (req.body as { From?: string } | undefined)?.From ?? req.ip ?? 'unknown',
    },
  })
  @Post('webhook/whatsapp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook para mensajes entrantes de WhatsApp',
    description:
      'Endpoint que recibe los mensajes enviados a tu número de WhatsApp desde Twilio',
  })
  @ApiBody({
    description: 'Datos del webhook de Twilio',
    type: WebhookMessageDto,
    examples: {
      'mensaje-texto': {
        summary: 'Mensaje de texto',
        value: {
          MessageSid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          AccountSid: 'Exmaple_AccountSid',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: 'Hola, este es un mensaje recibido',
          NumMedia: 0,
          SmsStatus: 'received',
        },
      },
      'mensaje-con-media': {
        summary: 'Mensaje con archivo multimedia',
        value: {
          MessageSid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          AccountSid: 'Example_AccountSid',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: 'Aquí tienes una imagen',
          NumMedia: 1,
          MediaUrl0:
            'https://api.twilio.com/2010-04-01/Accounts/.../Messages/.../Media/...',
          MediaContentType0: 'image/jpeg',
          SmsStatus: 'received',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Webhook aceptado. La respuesta al usuario se envía vía SDK (Messages API), no en el body HTTP.',
  })
  async receiveWhatsAppMessage(
    @Body() webhookData: WebhookMessageDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log('Webhook recibido de Twilio');
    this.logger.debug(
      'Datos del webhook:',
      JSON.stringify(webhookData, null, 2),
    );

    await this.twilioService.processIncomingMessage(webhookData);

    res.status(200).end();
  }

  @Get('message/:messageSid/status')
  @ApiOperation({
    summary: 'Obtener estado de mensaje',
    description:
      'Consulta el estado actual de un mensaje enviado usando su SID',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del mensaje obtenido exitosamente',
    schema: {
      example: {
        sid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        status: 'delivered',
        to: 'whatsapp:+1234567890',
        from: 'whatsapp:+14155238886',
        body: 'Hola, este es un mensaje de prueba',
        dateCreated: '2024-01-04T14:30:00Z',
        dateSent: '2024-01-04T14:30:05Z',
        dateUpdated: '2024-01-04T14:30:10Z',
        price: '-0.0055',
        priceUnit: 'USD',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  async getMessageStatus(@Param('messageSid') messageSid: string) {
    return await this.twilioService.getMessageStatus(messageSid);
  }
}
