import { Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { OpenaiController } from './openai.controller';
import { ConversationService } from './conversation.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConversationsController } from './conversations.controller';
import { MessagesController } from './messages.controller';

@Module({
  controllers: [OpenaiController, ConversationsController, MessagesController],
  providers: [OpenaiService, ConversationService, PrismaService],
  imports: [PrismaModule],
  exports: [OpenaiService, ConversationService],
})
export class OpenaiModule {}
