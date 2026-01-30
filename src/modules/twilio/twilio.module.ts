import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { TwilioController } from './twilio.controller';
import { ReplyMessageHandler } from './reply-message.handler';
import { TwilioWebhookGuard } from './guards/twilio-webhook.guard';
import { OpenaiModule } from '../openai/openai.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [OpenaiModule, PrismaModule],
  controllers: [TwilioController],
  providers: [ReplyMessageHandler, TwilioService, TwilioWebhookGuard],
  exports: [TwilioService],
})
export class TwilioModule {}
