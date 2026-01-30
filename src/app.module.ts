import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthGuard } from './modules/auth/guards/auth.guard';
import { OpenaiModule } from './modules/openai/openai.module';
import { UserModule } from './modules/user/user.module';
import { PatientModule } from './modules/patient/patient.module';
import { TwilioModule } from './modules/twilio/twilio.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { ClinicHistoryModule } from './modules/clinic-history/clinic-history.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'default', limit: 60, ttl: 60_000 },
    ]),
    PrismaModule,
    AuthModule,
    OpenaiModule,
    UserModule,
    PatientModule,
    TwilioModule,
    AppointmentModule,
    ClinicHistoryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
