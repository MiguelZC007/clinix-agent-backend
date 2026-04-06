import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Conversation, Message } from '@prisma/client';
import OpenAI from 'openai';
import environment from 'src/core/config/environments';
import { ErrorCode } from 'src/core/responses/problem-details.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  UpdateConversationDto,
  MIN_CONTEXT_TOKEN_LIMIT_OVERRIDE,
} from './dto/update-conversation.dto';
import { resolveModelContextProfile } from './model-context-profile.registry';
import { countTokens } from './utils/token-counter';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface PendingConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  metadata?: string;
}

interface ConversationContext {
  conversation: Conversation;
  messages: ConversationMessage[];
}

export interface ContextBudgetSnapshot {
  contextTokensUsed: number;
  contextTokenLimit: number;
  contextTokenLimitOverride: number | null;
}

export interface PreflightContextBudgetResult extends ContextBudgetSnapshot {
  conversation: Conversation & { messages: Message[] };
  messages: ConversationMessage[];
}

export class ContextBudgetExceededError extends Error {
  constructor() {
    super('context-budget-exceeded');
  }
}

const SESSION_TIMEOUT_MINUTES = 30;
const SUMMARY_CHUNK_SIZE = 5;
const RECENT_MESSAGES_TO_PRESERVE = 4;
const MAX_COMPACTION_ROUNDS = 5;

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly openai: OpenAI;

  constructor(private readonly prisma: PrismaService) {
    this.openai = new OpenAI({ apiKey: environment.OPENAI_API_KEY });
  }

  async findDoctorByPhone(
    phone: string,
  ): Promise<{ doctorId: string; doctorName: string } | null> {
    const normalizedPhone = phone.replace('whatsapp:', '').trim();
    const user = await this.prisma.user.findFirst({
      where: { phone: normalizedPhone, doctor: { isNot: null } },
      include: { doctor: true },
    });

    if (!user?.doctor) {
      return null;
    }

    return {
      doctorId: user.doctor.id,
      doctorName: `${user.name} ${user.lastName}`,
    };
  }

  async getOrCreateActiveConversation(
    doctorId: string,
    systemPrompt: string,
  ): Promise<ConversationContext> {
    const existingConversation = await this.prisma.conversation.findFirst({
      where: { doctorId, isActive: true },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!existingConversation) {
      return this.createNewConversation(doctorId, systemPrompt);
    }

    if (this.isSessionExpired(existingConversation.lastActivityAt)) {
      await this.prisma.conversation.update({
        where: { id: existingConversation.id },
        data: { isActive: false },
      });
      return this.createNewConversation(doctorId, systemPrompt);
    }

    await this.prisma.conversation.update({
      where: { id: existingConversation.id },
      data: { lastActivityAt: new Date(), model: environment.OPENAI_MODEL },
    });

    return {
      conversation: existingConversation,
      messages: this.buildContextMessages(existingConversation),
    };
  }

  async preflightContextBudget(
    conversationId: string,
    pendingMessages: PendingConversationMessage[] = [],
    model = environment.OPENAI_MODEL,
  ): Promise<PreflightContextBudgetResult> {
    let conversation =
      await this.requireConversationWithMessages(conversationId);
    const profile = resolveModelContextProfile(model);
    let compactionAttempted = false;

    for (let round = 0; round < MAX_COMPACTION_ROUNDS; round++) {
      const projectedTokens = this.computeProjectedPromptTokens(
        conversation,
        pendingMessages,
        model,
      );
      const effectiveLimit = this.getEffectiveContextLimit(
        conversation.contextTokenLimitOverride,
        model,
      );
      const pressureRatio = projectedTokens / effectiveLimit;

      if (pressureRatio < profile.compactionTriggerRatio) {
        return {
          conversation,
          messages: this.buildContextMessages(conversation),
          contextTokensUsed: projectedTokens,
          contextTokenLimit: effectiveLimit,
          contextTokenLimitOverride: conversation.contextTokenLimitOverride,
        };
      }

      compactionAttempted = true;
      const previousMessageCount = conversation.messages.length;
      const previousSummary = conversation.summary;
      const compacted = await this.compactOldestMessages(conversation, model);
      if (!compacted) {
        break;
      }

      conversation = await this.requireConversationWithMessages(conversationId);

      if (
        conversation.messages.length >= previousMessageCount &&
        conversation.summary === previousSummary
      ) {
        this.logger.warn(
          `Context compaction for conversation ${conversationId} did not survive refetch. Concurrent updates may have raced with compaction, so the latest persisted context will be used without additional optimistic assumptions.`,
        );
        break;
      }

      if (
        this.computeProjectedPromptTokens(
          conversation,
          pendingMessages,
          model,
        ) /
          effectiveLimit <=
        profile.compactionTargetRatio
      ) {
        return {
          conversation,
          messages: this.buildContextMessages(conversation),
          contextTokensUsed: this.computeProjectedPromptTokens(
            conversation,
            pendingMessages,
            model,
          ),
          contextTokenLimit: effectiveLimit,
          contextTokenLimitOverride: conversation.contextTokenLimitOverride,
        };
      }
    }

    const finalConversation =
      await this.requireConversationWithMessages(conversationId);
    const finalLimit = this.getEffectiveContextLimit(
      finalConversation.contextTokenLimitOverride,
      model,
    );
    const finalUsage = this.computeProjectedPromptTokens(
      finalConversation,
      pendingMessages,
      model,
    );

    if (finalUsage > finalLimit) {
      if (compactionAttempted) {
        this.logger.warn(
          `Conversation ${conversationId} still exceeds the context budget after compaction/refetch. This can happen when pending payloads are too large or concurrent requests append messages during compaction.`,
        );
      }
      throw new ContextBudgetExceededError();
    }

    return {
      conversation: finalConversation,
      messages: this.buildContextMessages(finalConversation),
      contextTokensUsed: finalUsage,
      contextTokenLimit: finalLimit,
      contextTokenLimitOverride: finalConversation.contextTokenLimitOverride,
    };
  }

  getEffectiveContextLimit(
    contextTokenLimitOverride: number | null | undefined,
    model = environment.OPENAI_MODEL,
  ): number {
    const profile = resolveModelContextProfile(model);
    const hardModelLimit =
      profile.contextWindow -
      profile.reservedForCompletion -
      profile.safetyMargin;

    if (contextTokenLimitOverride == null) {
      return hardModelLimit;
    }

    const normalizedOverride = Math.max(
      contextTokenLimitOverride,
      MIN_CONTEXT_TOKEN_LIMIT_OVERRIDE,
    );
    return Math.min(hardModelLimit, normalizedOverride);
  }

  computeContextTokenUsage(
    conversation: Conversation & { messages: Message[] },
    model = environment.OPENAI_MODEL,
  ): Promise<ContextBudgetSnapshot> {
    return Promise.resolve({
      contextTokensUsed: this.computeProjectedPromptTokens(
        conversation,
        [],
        model,
      ),
      contextTokenLimit: this.getEffectiveContextLimit(
        conversation.contextTokenLimitOverride,
        model,
      ),
      contextTokenLimitOverride: conversation.contextTokenLimitOverride,
    });
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<Message> {
    const tokenCount = this.estimateTokenCount(
      content,
      environment.OPENAI_MODEL,
    );

    return this.prisma.message.create({
      data: { conversationId, role, content, tokenCount },
    });
  }

  async getConversationById(
    conversationId: string,
  ): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async closeConversation(conversationId: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { isActive: false },
    });
  }

  async getActiveConversationByDoctorId(
    doctorId: string,
  ): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: { doctorId, isActive: true },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async listConversationsByDoctorId(
    doctorId: string,
  ): Promise<(Conversation & { messages: Message[] })[]> {
    return this.prisma.conversation.findMany({
      where: { doctorId },
      orderBy: { lastActivityAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async startNewConversation(
    doctorId: string,
    systemPrompt: string,
  ): Promise<Conversation> {
    await this.prisma.conversation.updateMany({
      where: { doctorId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.conversation.create({
      data: {
        doctorId,
        model: environment.OPENAI_MODEL,
        systemPrompt,
        isActive: true,
        lastActivityAt: new Date(),
      },
    });
  }

  async getConversationByIdForDoctor(
    conversationId: string,
    doctorId: string,
  ): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: { id: conversationId, doctorId },
    });
  }

  async getConversationWithMessagesForDoctor(
    conversationId: string,
    doctorId: string,
  ): Promise<(Conversation & { messages: Message[] }) | null> {
    return this.prisma.conversation.findFirst({
      where: { id: conversationId, doctorId },
      include: { messages: { orderBy: { createdAt: 'asc' as const } } },
    });
  }

  async getContextTokenUsage(
    conversationId: string,
    doctorId: string,
  ): Promise<ContextBudgetSnapshot> {
    const conversation = await this.getConversationWithMessagesForDoctor(
      conversationId,
      doctorId,
    );
    if (!conversation) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    return this.computeContextTokenUsage(conversation);
  }

  async getContextForConversation(
    conversationId: string,
    doctorId: string,
  ): Promise<ConversationMessage[]> {
    const conversation = await this.getConversationWithMessagesForDoctor(
      conversationId,
      doctorId,
    );
    if (!conversation) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    return this.preflightContextBudget(conversation.id).then(
      (result) => result.messages,
    );
  }

  async updateConversation(
    conversationId: string,
    doctorId: string,
    data: UpdateConversationDto,
  ): Promise<Conversation> {
    const conversation = await this.getConversationByIdForDoctor(
      conversationId,
      doctorId,
    );
    if (!conversation) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        contextTokenLimitOverride:
          data.contextTokenLimitOverride === undefined
            ? conversation.contextTokenLimitOverride
            : data.contextTokenLimitOverride,
        model: environment.OPENAI_MODEL,
      },
    });
  }

  async listMessagesByConversationId(
    conversationId: string,
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMessageForConversation(
    conversationId: string,
    doctorId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<Message> {
    const conversation = await this.getConversationByIdForDoctor(
      conversationId,
      doctorId,
    );
    if (!conversation) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const tokenCount = this.estimateTokenCount(
      content,
      environment.OPENAI_MODEL,
    );
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, role, content, tokenCount },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastActivityAt: new Date(), model: environment.OPENAI_MODEL },
      }),
    ]);

    return message;
  }

  async markConversationMessagesAsRead(
    conversationId: string,
    doctorId: string,
  ): Promise<{ updatedCount: number }> {
    const conversation = await this.getConversationByIdForDoctor(
      conversationId,
      doctorId,
    );
    if (!conversation) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const result = await this.prisma.message.updateMany({
      where: { conversationId, readAt: null },
      data: { readAt: new Date() },
    });

    return { updatedCount: result.count };
  }

  private isSessionExpired(lastActivityAt: Date): boolean {
    return (
      (Date.now() - lastActivityAt.getTime()) / (1000 * 60) >
      SESSION_TIMEOUT_MINUTES
    );
  }

  private async createNewConversation(
    doctorId: string,
    systemPrompt: string,
  ): Promise<ConversationContext> {
    const conversation = await this.prisma.conversation.create({
      data: {
        doctorId,
        model: environment.OPENAI_MODEL,
        systemPrompt,
        isActive: true,
        lastActivityAt: new Date(),
      },
      include: { messages: true },
    });

    return { conversation, messages: [] };
  }

  private buildContextMessages(
    conversation: Conversation & { messages: Message[] },
  ): ConversationMessage[] {
    const messages: ConversationMessage[] = [];
    if (conversation.summary) {
      messages.push({
        role: 'system',
        content: `Resumen de la conversación anterior:\n${conversation.summary}`,
      });
    }

    for (const message of conversation.messages) {
      messages.push({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      });
    }

    return messages;
  }

  private computeProjectedPromptTokens(
    conversation: Conversation & { messages: Message[] },
    pendingMessages: PendingConversationMessage[],
    model = environment.OPENAI_MODEL,
  ): number {
    const summaryTokens = conversation.summary
      ? this.estimateTokenCount(
          `Resumen de la conversación anterior:\n${conversation.summary}`,
          model,
        )
      : 0;

    return (
      this.estimateTokenCount(conversation.systemPrompt, model) +
      summaryTokens +
      conversation.messages.reduce(
        (total, message) =>
          total +
          (message.tokenCount ??
            this.estimateTokenCount(message.content, model)),
        0,
      ) +
      pendingMessages.reduce(
        (total, message) =>
          total +
          this.estimateTokenCount(message.content ?? '', model) +
          this.estimateTokenCount(message.metadata ?? '', model),
        0,
      )
    );
  }

  private estimateTokenCount(
    text: string,
    model = environment.OPENAI_MODEL,
  ): number {
    return countTokens(text, resolveModelContextProfile(model).tokenizerModel);
  }

  private async compactOldestMessages(
    conversation: Conversation & { messages: Message[] },
    model = environment.OPENAI_MODEL,
  ): Promise<boolean> {
    if (conversation.messages.length <= RECENT_MESSAGES_TO_PRESERVE) {
      return false;
    }

    const eligibleMessages = conversation.messages.slice(
      0,
      Math.max(0, conversation.messages.length - RECENT_MESSAGES_TO_PRESERVE),
    );
    const messagesToSummarize = eligibleMessages.slice(0, SUMMARY_CHUNK_SIZE);

    if (messagesToSummarize.length === 0) {
      return false;
    }

    const newSummary = await this.generateSummary(
      conversation.summary,
      messagesToSummarize,
      model,
    );
    await this.prisma.$transaction([
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { summary: newSummary, model, lastActivityAt: new Date() },
      }),
      this.prisma.message.deleteMany({
        where: { id: { in: messagesToSummarize.map((message) => message.id) } },
      }),
    ]);

    return true;
  }

  private async generateSummary(
    existingSummary: string | null,
    messages: Message[],
    model = environment.OPENAI_MODEL,
  ): Promise<string> {
    const messagesText = messages
      .map(
        (message) =>
          `${message.role === 'user' ? 'Médico' : 'Asistente'}: ${message.content}`,
      )
      .join('\n');

    const prompt = existingSummary
      ? `Resumen existente:\n${existingSummary}\n\nNuevos mensajes a integrar:\n${messagesText}\n\nGenera un resumen actualizado y conciso que integre la información relevante. Mantén solo los datos importantes para el contexto médico.`
      : `Mensajes de la conversación:\n${messagesText}\n\nGenera un resumen conciso de esta conversación médica. Incluye pacientes mencionados, acciones realizadas e información pendiente.`;

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que resume conversaciones médicas de forma concisa. Máximo 300 palabras.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || existingSummary || '';
  }

  private async requireConversationWithMessages(
    conversationId: string,
  ): Promise<Conversation & { messages: Message[] }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    return conversation;
  }
}
