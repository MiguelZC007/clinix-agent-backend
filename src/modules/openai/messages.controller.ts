import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Message } from '@prisma/client';
import { User } from 'src/core/decorators/user.decorator';
import { getDoctorId } from 'src/common/utils/get-doctor-id.util';
import { ConversationService } from './conversation.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { OpenaiService } from './openai.service';

@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly openaiService: OpenaiService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear un mensaje en una conversación' })
  @ApiResponse({
    status: 201,
    description: 'Mensaje creado',
    type: MessageResponseDto,
  })
  async create(
    @Body() dto: CreateMessageDto,
    @User() user: unknown,
  ): Promise<MessageResponseDto> {
    const doctorId = getDoctorId(user);
    const message = await this.conversationService.createMessageForConversation(
      dto.conversationId,
      doctorId,
      dto.role ?? 'user',
      dto.content,
    );
    await this.openaiService.processMessageInConversation(
      doctorId,
      dto.conversationId,
    );
    return this.toMessageDto(message);
  }

  private toMessageDto(message: Message): MessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversationId ?? undefined,
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
      tokenCount: message.tokenCount,
      readAt: message.readAt ?? undefined,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
