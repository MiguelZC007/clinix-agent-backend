import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { TwilioController } from './twilio.controller';

@Module({
  controllers: [TwilioController],
  providers: [TwilioService],
  exports: [TwilioService], // Exportar el servicio para uso en otros módulos
})
export class TwilioModule {}
