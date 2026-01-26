import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import {
  AppointmentController,
  PatientAppointmentsController,
} from './appointment.controller';

@Module({
  controllers: [AppointmentController, PatientAppointmentsController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
