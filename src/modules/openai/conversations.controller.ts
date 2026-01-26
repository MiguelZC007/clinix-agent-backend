import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Conversation, Message } from '@prisma/client';
import { User } from 'src/core/decorators/user.decorator';
import { ErrorCode } from 'src/core/responses/problem-details.dto';
import { ConversationService } from './conversation.service';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';

type DoctorRef = { id: string };
type AuthenticatedRequestUser = { doctor?: DoctorRef | null };

@ApiTags('Conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  @ApiOperation({ summary: 'Listar conversaciones del doctor autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de conversaciones',
    type: [ConversationResponseDto],
  })
  async findAll(@User() user: unknown): Promise<ConversationResponseDto[]> {
    const doctorId = this.getDoctorId(user);
    const conversations =
      await this.conversationService.listConversationsByDoctorId(doctorId);
    return conversations.map((c) => this.toConversationDto(c));
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Listar mensajes de una conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de mensajes',
    type: [MessageResponseDto],
  })
  async listMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: unknown,
  ): Promise<MessageResponseDto[]> {
    const doctorId = this.getDoctorId(user);
    const conversation = await this.conversationService.getConversationByIdForDoctor(
      id,
      doctorId,
    );
    if (!conversation) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }
    const messages = await this.conversationService.listMessagesByConversationId(
      id,
    );
    return messages.map((m) => this.toMessageDto(m));
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Marcar mensajes de una conversación como leídos' })
  @ApiParam({ name: 'id', description: 'ID de la conversación (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cantidad de mensajes marcados como leídos',
    schema: {
      type: 'object',
      properties: { updatedCount: { type: 'number', example: 3 } },
    },
  })
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: unknown,
  ): Promise<{ updatedCount: number }> {
    const doctorId = this.getDoctorId(user);
    return this.conversationService.markConversationMessagesAsRead(id, doctorId);
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

  private toConversationDto(conversation: Conversation): ConversationResponseDto {
    return {
      id: conversation.id,
      model: conversation.model,
      systemPrompt: conversation.systemPrompt,
      summary: conversation.summary ?? undefined,
      lastActivityAt: conversation.lastActivityAt,
      isActive: conversation.isActive,
      doctorId: conversation.doctorId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
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

