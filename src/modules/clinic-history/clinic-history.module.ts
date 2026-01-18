import { Module } from '@nestjs/common';
import { ClinicHistoryService } from './clinic-history.service';
import {
  ClinicHistoryController,
  PatientClinicHistoriesController,
} from './clinic-history.controller';

@Module({
  controllers: [ClinicHistoryController, PatientClinicHistoriesController],
  providers: [ClinicHistoryService],
  exports: [ClinicHistoryService],
})
export class ClinicHistoryModule {}
