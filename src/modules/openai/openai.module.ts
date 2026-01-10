import { Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { OpenaiController } from './openai.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [OpenaiController],
  providers: [OpenaiService, PrismaService],
  imports: [PrismaModule],
})
export class OpenaiModule {}
