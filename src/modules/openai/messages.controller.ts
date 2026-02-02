import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Message } from '@prisma/client';
import { User } from 'src/core/decorators/user.decorator';
import { ErrorCode } from 'src/core/responses/problem-details.dto';
import { ConversationService } from './conversation.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { OpenaiService } from './openai.service';

type DoctorRef = { id: string };
type AuthenticatedRequestUser = { doctor?: DoctorRef | null };

@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly openaiService: OpenaiService,
  ) { }

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
    const doctorId = this.getDoctorId(user);
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

  private getDoctorId(user: unknown): string {
    if (!user || typeof user !== 'object') {
      throw new ForbiddenException(ErrorCode.UNAUTHORIZED);
    }
    const doctor = (user as AuthenticatedRequestUser).doctor;
    if (!doctor || typeof doctor !== 'object') {
      throw new ForbiddenException(ErrorCode.UNAUTHORIZED);
    }
    const id = (doctor as DoctorRef).id;
    if (typeof id !== 'string' || id.length === 0) {
      throw new ForbiddenException(ErrorCode.UNAUTHORIZED);
    }
    return id;
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

