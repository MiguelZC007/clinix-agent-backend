import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { OpenaiModule } from './modules/openai/openai.module';
import { UserModule } from './modules/user/user.module';
import { PatientModule } from './modules/patient/patient.module';
import { TwilioModule } from './modules/twilio/twilio.module';

@Module({
  imports: [PrismaModule, OpenaiModule, UserModule, PatientModule, TwilioModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
