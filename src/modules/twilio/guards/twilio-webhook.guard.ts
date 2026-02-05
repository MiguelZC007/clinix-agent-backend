import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import twilio from 'twilio';
import environment from 'src/core/config/environments';

@Injectable()
export class TwilioWebhookGuard implements CanActivate {
  private readonly logger = new Logger(TwilioWebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    this.logger.log(
      `Validando webhook: url=${request.originalUrl} signature=${request.header('X-Twilio-Signature') ? 'presente' : 'ausente'}`,
    );
    const authToken = environment.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      this.logger.error('TWILIO_AUTH_TOKEN no configurado para validar webhook');
      throw new ForbiddenException('twilio-webhook-validation-unavailable');
    }
    const signature = request.header('X-Twilio-Signature') ?? '';
    const proto = (request.get('x-forwarded-proto') ?? request.protocol ?? 'https')
      .split(',')[0]
      .trim();
    const host = request.get('x-forwarded-host') ?? request.get('host') ?? '';
    const webhookUrl = `${proto}://${host}${request.originalUrl}`;
    const params = (request.body as Record<string, string>) ?? {};
    const isValid = twilio.validateRequest(
      authToken,
      signature,
      webhookUrl,
      params,
    );
    if (!isValid) {
      this.logger.warn('Firma de webhook Twilio inválida', {
        webhookUrl,
        xForwardedProto: request.get('x-forwarded-proto'),
        host: request.get('host'),
        xForwardedHost: request.get('x-forwarded-host'),
        originalUrl: request.originalUrl,
      });
      throw new ForbiddenException('twilio-webhook-signature-invalid');
    }
    const bodyKeys = Object.keys(params);
    this.logger.log(
      `Webhook body keys: ${bodyKeys.join(', ')} | MessageSid=${params.MessageSid ?? 'n/a'} From=${params.From ?? 'n/a'}`,
    );
    return true;
  }
}
