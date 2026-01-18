import { Test, TestingModule } from '@nestjs/testing';
import { OpenaiController } from './openai.controller';
import { OpenaiService } from './openai.service';
import { MessageOpenaiDto } from './dto/message-openai.dto';

describe('OpenaiController', () => {
  let controller: OpenaiController;
  let service: jest.Mocked<OpenaiService>;

  beforeEach(async () => {
    const mockService = {
      conversation: jest.fn(),
      sendMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenaiController],
      providers: [{ provide: OpenaiService, useValue: mockService }],
    }).compile();

    controller = module.get<OpenaiController>(OpenaiController);
    service = module.get(OpenaiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe llamar a openaiService.conversation', async () => {
      const dto: MessageOpenaiDto = { message: 'Hola' };
      const mockRequest = {} as Request;
      const mockResponse = { id: 'response-id', output: [] };

      service.conversation.mockResolvedValue(mockResponse as never);

      const result = await controller.create(dto, mockRequest);

      expect(service.conversation).toHaveBeenCalledWith('', dto);
      expect(result).toEqual(mockResponse);
    });
  });
});
