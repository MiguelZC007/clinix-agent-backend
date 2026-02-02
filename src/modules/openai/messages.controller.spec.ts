import { Test, TestingModule } from '@nestjs/testing';
import { Message } from '@prisma/client';
import { MessagesController } from './messages.controller';
import { ConversationService } from './conversation.service';
import { OpenaiService } from './openai.service';

describe('MessagesController', () => {
  let controller: MessagesController;
  let mockConversationService: {
    createMessageForConversation: jest.Mock;
  };
  let mockOpenaiService: {
    processMessageInConversation: jest.Mock;
  };

  const mockUser = {
    doctor: { id: 'doctor-uuid' },
  };

  const mockMessage: Message = {
    id: 'msg-uuid',
    conversationId: 'conv-uuid',
    role: 'user',
    content: 'Hola',
    tokenCount: 1,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockConversationService = {
      createMessageForConversation: jest.fn().mockResolvedValue(mockMessage),
    };
    mockOpenaiService = {
      processMessageInConversation: jest.fn().mockResolvedValue('Respuesta'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        { provide: ConversationService, useValue: mockConversationService },
        { provide: OpenaiService, useValue: mockOpenaiService },
      ],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('crea mensaje del usuario, llama a processMessageInConversation y devuelve el mensaje creado', async () => {
      const dto = {
        conversationId: 'conv-uuid',
        role: 'user' as const,
        content: 'Hola',
      };

      const result = await controller.create(dto, mockUser);

      expect(mockConversationService.createMessageForConversation).toHaveBeenCalledWith(
        'conv-uuid',
        'doctor-uuid',
        'user',
        'Hola',
      );
      expect(mockOpenaiService.processMessageInConversation).toHaveBeenCalledWith(
        'doctor-uuid',
        'conv-uuid',
      );
      expect(result.id).toBe('msg-uuid');
      expect(result.role).toBe('user');
      expect(result.content).toBe('Hola');
    });
  });
});
