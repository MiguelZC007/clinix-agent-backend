import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Conversation, Message } from '@prisma/client';
import { User } from 'src/core/decorators/user.decorator';
import { ErrorCode } from 'src/core/responses/problem-details.dto';
import { getDoctorId } from 'src/common/utils/get-doctor-id.util';
import {
  ConversationService,
  ContextBudgetSnapshot,
} from './conversation.service';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { OpenaiService } from './openai.service';

@ApiTags('Conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly openaiService: OpenaiService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar conversaciones del doctor autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de conversaciones',
    type: [ConversationResponseDto],
  })
  async findAll(@User() user: unknown): Promise<ConversationResponseDto[]> {
    const doctorId = getDoctorId(user);
    const conversations =
      await this.conversationService.listConversationsByDoctorId(doctorId);

    return Promise.all(
      conversations.map(async (conversation) =>
        this.toConversationDto(
          conversation,
          await this.conversationService.computeContextTokenUsage(conversation),
        ),
      ),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Iniciar una nueva conversación' })
  @ApiResponse({
    status: 201,
    description: 'Conversación creada',
    type: ConversationResponseDto,
  })
  async create(@User() user: unknown): Promise<ConversationResponseDto> {
    const doctorId = getDoctorId(user);
    const conversation = await this.conversationService.startNewConversation(
      doctorId,
      this.openaiService.getSystemPrompt(),
    );

    return this.toConversationDto(
      conversation,
      await this.conversationService.computeContextTokenUsage({
        ...conversation,
        messages: [],
      }),
    );
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
    const doctorId = getDoctorId(user);
    const conversation =
      await this.conversationService.getConversationByIdForDoctor(id, doctorId);
    if (!conversation) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const messages =
      await this.conversationService.listMessagesByConversationId(id);
    return messages.map((message) => this.toMessageDto(message));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una conversación por ID con uso de contexto',
  })
  @ApiParam({ name: 'id', description: 'ID de la conversación (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Conversación con budget efectivo',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: unknown,
  ): Promise<ConversationResponseDto> {
    const doctorId = getDoctorId(user);
    const conversation =
      await this.conversationService.getConversationWithMessagesForDoctor(
        id,
        doctorId,
      );

    if (!conversation) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    return this.toConversationDto(
      { ...conversation, messages: conversation.messages.slice(-1).reverse() },
      await this.conversationService.computeContextTokenUsage(conversation),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar configuración de una conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Conversación actualizada',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
    @User() user: unknown,
  ): Promise<ConversationResponseDto> {
    const doctorId = getDoctorId(user);
    const conversation = await this.conversationService.updateConversation(
      id,
      doctorId,
      dto,
    );
    const conversationWithMessages =
      await this.conversationService.getConversationWithMessagesForDoctor(
        id,
        doctorId,
      );

    if (!conversationWithMessages) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    return this.toConversationDto(
      conversation,
      await this.conversationService.computeContextTokenUsage(
        conversationWithMessages,
      ),
    );
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
    const doctorId = getDoctorId(user);
    return this.conversationService.markConversationMessagesAsRead(
      id,
      doctorId,
    );
  }

  private toConversationDto(
    conversation: Conversation & { messages?: Message[] },
    tokenUsage: ContextBudgetSnapshot,
  ): ConversationResponseDto {
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
      contextTokensUsed: tokenUsage.contextTokensUsed,
      contextTokenLimit: tokenUsage.contextTokenLimit,
      contextTokenLimitOverride: tokenUsage.contextTokenLimitOverride,
      title: this.deriveTitle(conversation),
      lastMessagePreview:
        conversation.messages?.[0]?.content?.trim() || undefined,
    };
  }

  private deriveTitle(conversation: Conversation): string {
    if (conversation.summary && conversation.summary.trim().length > 0) {
      const trimmed = conversation.summary.trim();
      return trimmed.length > 50 ? `${trimmed.slice(0, 47)}...` : trimmed;
    }

    const date = new Date(conversation.lastActivityAt);
    return `Conversación ${date.getDate()} ${date.toLocaleDateString('es', { month: 'short' })}`;
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
