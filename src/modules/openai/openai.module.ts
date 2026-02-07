import { Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { OpenaiController } from './openai.controller';
import { ConversationService } from './conversation.service';
import { AuthSessionService } from './auth-session.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { AppointmentModule } from '../appointment/appointment.module';
import { ClinicHistoryModule } from '../clinic-history/clinic-history.module';
import { ConversationsController } from './conversations.controller';
import { MessagesController } from './messages.controller';

@Module({
  controllers: [OpenaiController, ConversationsController, MessagesController],
  providers: [OpenaiService, ConversationService, AuthSessionService, PrismaService],
  imports: [PrismaModule, AppointmentModule, ClinicHistoryModule],
  exports: [OpenaiService, ConversationService, AuthSessionService],
})
export class OpenaiModule { }
