import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Conversation, Message } from '@prisma/client';
import environment from 'src/core/config/environments';
import OpenAI from 'openai';
import { ErrorCode } from 'src/core/responses/problem-details.dto';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ConversationContext {
  conversation: Conversation;
  messages: ConversationMessage[];
}

const SESSION_TIMEOUT_MINUTES = 30;
const MAX_RECENT_MESSAGES = 10;
const MESSAGES_THRESHOLD_FOR_SUMMARY = 15;
const MESSAGES_TO_SUMMARIZE = 5;

@Injectable()
export class ConversationService {
  private readonly openai: OpenAI;

  constructor(private readonly prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: environment.OPENAI_API_KEY,
    });
  }

  async findDoctorByPhone(
    phone: string,
  ): Promise<{ doctorId: string; doctorName: string } | null> {
    const normalizedPhone = this.normalizePhoneNumber(phone);

    const user = await this.prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        doctor: { isNot: null },
      },
      include: {
        doctor: true,
      },
    });

    if (!user || !user.doctor) {
      return null;
    }

    return {
      doctorId: user.doctor.id,
      doctorName: `${user.name} ${user.lastName}`,
    };
  }

  private normalizePhoneNumber(phone: string): string {
    return phone.replace('whatsapp:', '').trim();
  }

  async getOrCreateActiveConversation(
    doctorId: string,
    systemPrompt: string,
  ): Promise<ConversationContext> {
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        doctorId,
        isActive: true,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (existingConversation) {
      const isSessionExpired = this.isSessionExpired(
        existingConversation.lastActivityAt,
      );

      if (isSessionExpired) {
        await this.prisma.conversation.update({
          where: { id: existingConversation.id },
          data: { isActive: false },
        });

        return this.createNewConversation(doctorId, systemPrompt);
      }

      await this.prisma.conversation.update({
        where: { id: existingConversation.id },
        data: { lastActivityAt: new Date() },
      });

      const messages = this.buildContextMessages(existingConversation);

      return {
        conversation: existingConversation,
        messages,
      };
    }

    return this.createNewConversation(doctorId, systemPrompt);
  }

  private isSessionExpired(lastActivityAt: Date): boolean {
    const now = new Date();
    const diffMs = now.getTime() - lastActivityAt.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes > SESSION_TIMEOUT_MINUTES;
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
      include: {
        messages: true,
      },
    });

    return {
      conversation,
      messages: [],
    };
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

    const limit = conversation.contextMessageLimit ?? MAX_RECENT_MESSAGES;
    const recentMessages = conversation.messages.slice(-limit);

    for (const msg of recentMessages) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    return messages;
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<Message> {
    const tokenCount = this.estimateTokenCount(content);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        tokenCount,
      },
    });

    await this.checkAndUpdateSummary(conversationId);

    return message;
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private async checkAndUpdateSummary(conversationId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) return;

    const totalMessages = conversation.messages.length;

    if (totalMessages > MESSAGES_THRESHOLD_FOR_SUMMARY) {
      const messagesToSummarize = conversation.messages.slice(
        0,
        MESSAGES_TO_SUMMARIZE,
      );
      const newSummary = await this.generateSummary(
        conversation.summary,
        messagesToSummarize,
      );

      await this.prisma.$transaction([
        this.prisma.conversation.update({
          where: { id: conversationId },
          data: { summary: newSummary },
        }),
        this.prisma.message.deleteMany({
          where: {
            id: {
              in: messagesToSummarize.map((m) => m.id),
            },
          },
        }),
      ]);
    }
  }

  private async generateSummary(
    existingSummary: string | null,
    messages: Message[],
  ): Promise<string> {
    const messagesText = messages
      .map((m) => `${m.role === 'user' ? 'Médico' : 'Asistente'}: ${m.content}`)
      .join('\n');

    const prompt = existingSummary
      ? `Resumen existente:\n${existingSummary}\n\nNuevos mensajes a integrar:\n${messagesText}\n\nGenera un resumen actualizado y conciso que integre la información relevante. Mantén solo los datos importantes para el contexto médico (pacientes mencionados, acciones realizadas, información pendiente).`
      : `Mensajes de la conversación:\n${messagesText}\n\nGenera un resumen conciso de esta conversación médica. Incluye: pacientes mencionados, acciones realizadas, información pendiente.`;

    const response = await this.openai.chat.completions.create({
      model: environment.OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que resume conversaciones médicas de forma concisa. Máximo 300 palabras.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || existingSummary || '';
  }

  async getConversationById(
    conversationId: string,
  ): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
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
      where: {
        doctorId,
        isActive: true,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async listConversationsByDoctorId(
    doctorId: string,
  ): Promise<(Conversation & { messages: Message[] })[]> {
    return this.prisma.conversation.findMany({
      where: { doctorId },
      orderBy: { lastActivityAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
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
      where: {
        id: conversationId,
        doctorId,
      },
    });
  }

  async getConversationWithMessagesForDoctor(
    conversationId: string,
    doctorId: string,
  ): Promise<(Conversation & { messages: Message[] }) | null> {
    return this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        doctorId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' as const },
        },
      },
    });
  }

  async getContextForConversation(
    conversationId: string,
    doctorId: string,
  ): Promise<ConversationMessage[]> {
    const conversation =
      await this.getConversationWithMessagesForDoctor(conversationId, doctorId);
    if (!conversation) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }
    return this.buildContextMessages(conversation);
  }

  async updateConversation(
    conversationId: string,
    doctorId: string,
    data: { contextMessageLimit?: number },
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
        ...(data.contextMessageLimit !== undefined && {
          contextMessageLimit: data.contextMessageLimit,
        }),
      },
    });
  }

  async listMessagesByConversationId(conversationId: string): Promise<Message[]> {
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

    const tokenCount = this.estimateTokenCount(content);

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          role,
          content,
          tokenCount,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastActivityAt: new Date() },
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
      where: {
        conversationId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }
}
