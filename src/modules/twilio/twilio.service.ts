import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateTwilioDto } from './dto/create-twilio.dto';
import { UpdateTwilioDto } from './dto/update-twilio.dto';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
import { WebhookMessageDto } from './dto/webhook-message.dto';
import twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private twilioClient: any;

  constructor() {
    // Inicializar cliente de Twilio con variables de entorno
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      this.logger.error(
        'TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN deben estar configurados en las variables de entorno',
      );
      throw new Error('Configuración de Twilio incompleta');
    }

    this.twilioClient = twilio(accountSid, authToken);
    this.logger.log('Cliente de Twilio inicializado correctamente');
  }

  /**
   * Envía un mensaje de WhatsApp usando la API de Twilio
   */
  async sendWhatsAppMessage(sendMessageDto: SendWhatsAppMessageDto) {
    try {
      const { to, body } = sendMessageDto;

      // Formato del número de WhatsApp
      const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      this.logger.log(`Enviando mensaje de WhatsApp a ${toNumber}`);

      const messageOptions: any = {
        from: fromNumber,
        to: toNumber,
        body: body,
      };

      // // Agregar media si se proporciona
      // if (mediaUrl) {
      //   messageOptions.mediaUrl = [mediaUrl];
      // }

      const message = await this.twilioClient.messages.create(messageOptions);

      this.logger.log(`Mensaje enviado exitosamente. SID: ${message.sid}`);

      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        dateCreated: message.dateCreated,
        price: message.price,
        priceUnit: message.priceUnit,
      };
    } catch (error) {
      this.logger.error(
        `Error enviando mensaje de WhatsApp: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`Error enviando mensaje: ${error.message}`);
    }
  }

  /**
   * Procesa los mensajes recibidos del webhook de Twilio
   */
  async processIncomingMessage(webhookData: WebhookMessageDto) {
    try {
      this.logger.log('=== MENSAJE RECIBIDO DE WHATSAPP ===');
      this.logger.log(`De: ${webhookData.From}`);
      this.logger.log(`Para: ${webhookData.To}`);
      this.logger.log(`Mensaje: ${webhookData.Body}`);
      this.logger.log(`SID del mensaje: ${webhookData.MessageSid}`);
      this.logger.log(`Estado: ${webhookData.SmsStatus || 'N/A'}`);

      if (webhookData.NumMedia && webhookData.NumMedia > 0) {
        this.logger.log(`Archivos multimedia: ${webhookData.NumMedia}`);
        if (webhookData.MediaUrl0) {
          this.logger.log(`URL del archivo: ${webhookData.MediaUrl0}`);
          this.logger.log(
            `Tipo de archivo: ${webhookData.MediaContentType0 || 'N/A'}`,
          );
        }
      }

      this.logger.log('=====================================');

      // Aquí puedes agregar lógica adicional para procesar el mensaje
      // Por ejemplo: guardar en base de datos, enviar respuesta automática, etc.

      return {
        success: true,
        message: 'Mensaje procesado correctamente',
        data: {
          messageSid: webhookData.MessageSid,
          from: webhookData.From,
          to: webhookData.To,
          body: webhookData.Body,
          hasMedia: (webhookData.NumMedia || 0) > 0,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error procesando mensaje entrante: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Error procesando mensaje: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene el estado de un mensaje por su SID
   */
  async getMessageStatus(messageSid: string) {
    try {
      const message = await this.twilioClient.messages(messageSid).fetch();

      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        price: message.price,
        priceUnit: message.priceUnit,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error) {
      this.logger.error(
        `Error obteniendo estado del mensaje: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Error obteniendo estado: ${error.message}`,
      );
    }
  }

  // Métodos originales del scaffold (mantenidos para compatibilidad)
  create(createTwilioDto: CreateTwilioDto) {
    return 'This action adds a new twilio';
  }

  findAll() {
    return `This action returns all twilio`;
  }

  findOne(id: number) {
    return `This action returns a #${id} twilio`;
  }

  update(id: number, updateTwilioDto: UpdateTwilioDto) {
    return `This action updates a #${id} twilio`;
  }

  remove(id: number) {
    return `This action removes a #${id} twilio`;
  }
}
