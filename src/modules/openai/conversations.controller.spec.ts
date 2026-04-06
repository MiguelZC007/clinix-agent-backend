import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsController } from './conversations.controller';
import { ConversationService } from './conversation.service';
import { OpenaiService } from './openai.service';
import { UpdateConversationDto } from './dto/update-conversation.dto';

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let validationPipe: ValidationPipe;
  let conversationService: {
    updateConversation: jest.Mock;
    getConversationWithMessagesForDoctor: jest.Mock;
    computeContextTokenUsage: jest.Mock;
  };

  const baseConversation = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    model: 'gpt-4',
    systemPrompt: 'prompt',
    summary: null,
    contextTokenLimitOverride: null,
    lastActivityAt: new Date('2026-04-06T00:00:00.000Z'),
    isActive: true,
    doctorId: 'doctor-uuid',
    createdAt: new Date('2026-04-06T00:00:00.000Z'),
    updatedAt: new Date('2026-04-06T00:00:00.000Z'),
    messages: [],
  };

  beforeEach(async () => {
    validationPipe = new ValidationPipe({ transform: true, whitelist: true });
    conversationService = {
      updateConversation: jest.fn().mockResolvedValue({
        ...baseConversation,
        contextTokenLimitOverride: 32_000,
      }),
      getConversationWithMessagesForDoctor: jest
        .fn()
        .mockResolvedValue(baseConversation),
      computeContextTokenUsage: jest.fn().mockResolvedValue({
        contextTokensUsed: 0,
        contextTokenLimit: 32_000,
        contextTokenLimitOverride: 32_000,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        { provide: ConversationService, useValue: conversationService },
        {
          provide: OpenaiService,
          useValue: { getSystemPrompt: jest.fn().mockReturnValue('prompt') },
        },
      ],
    }).compile();

    controller = module.get(ConversationsController);
  });

  it('acepta contextTokenLimitOverride válido y lo retorna', async () => {
    const result = await controller.update(
      baseConversation.id,
      { contextTokenLimitOverride: 32_000 },
      { doctor: { id: 'doctor-uuid' } },
    );

    expect(conversationService.updateConversation).toHaveBeenCalledWith(
      baseConversation.id,
      'doctor-uuid',
      { contextTokenLimitOverride: 32_000 },
    );
    expect(result.contextTokenLimitOverride).toBe(32_000);
  });

  it('permite limpiar el override con null', async () => {
    conversationService.updateConversation.mockResolvedValueOnce({
      ...baseConversation,
      contextTokenLimitOverride: null,
    });
    conversationService.computeContextTokenUsage.mockResolvedValueOnce({
      contextTokensUsed: 0,
      contextTokenLimit: 115_712,
      contextTokenLimitOverride: null,
    });

    const result = await controller.update(
      baseConversation.id,
      { contextTokenLimitOverride: null },
      { doctor: { id: 'doctor-uuid' } },
    );

    expect(result.contextTokenLimitOverride).toBeNull();
  });

  it('rechaza overrides fuera de rango en el DTO', async () => {
    const dto = plainToInstance(UpdateConversationDto, {
      contextTokenLimitOverride: 1000,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toBeDefined();
  });

  it('rechaza runtime un override inválido y no intenta persistir cambios', async () => {
    await expect(
      validationPipe.transform(
        { contextTokenLimitOverride: 1000 },
        {
          type: 'body',
          metatype: UpdateConversationDto,
          data: '',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(conversationService.updateConversation).not.toHaveBeenCalled();
    expect(
      conversationService.getConversationWithMessagesForDoctor,
    ).not.toHaveBeenCalled();
  });
});
