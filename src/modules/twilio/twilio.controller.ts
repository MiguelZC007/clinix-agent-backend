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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { TwilioService } from './twilio.service';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
import { WebhookMessageDto } from './dto/webhook-message.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Twilio WhatsApp')
@Controller('twilio')
export class TwilioController {
  private readonly logger = new Logger(TwilioController.name);

  constructor(private readonly twilioService: TwilioService) {}

  @Post('whatsapp/send')
  @ApiOperation({
    summary: 'Enviar mensaje de WhatsApp',
    description:
      'Envía un mensaje de texto o multimedia a través de WhatsApp usando Twilio',
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

  @Public()
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
    try {
      this.logger.log('Webhook recibido de Twilio');
      this.logger.log('Webhook req de Twilio', req.body);
      this.logger.debug(
        'Datos del webhook:',
        JSON.stringify(webhookData, null, 2),
      );

      await this.twilioService.processIncomingMessage(webhookData);

      res.status(200).end();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error procesando webhook: ${message}`, stack);
      res.status(500).json({
        success: false,
        message: 'Error procesando webhook',
        error: message,
      });
    }
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
