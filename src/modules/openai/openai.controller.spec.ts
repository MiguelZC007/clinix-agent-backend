import { Test, TestingModule } from '@nestjs/testing';
import { OpenaiController } from './openai.controller';
import { OpenaiService } from './openai.service';

describe('OpenaiController', () => {
  let controller: OpenaiController;
  let service: jest.Mocked<OpenaiService>;

  beforeEach(async () => {
    const mockService = {
      processMessageFromDoctor: jest.fn(),
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

  describe('processMessage', () => {
    it('debe llamar a openaiService.processMessageFromDoctor', async () => {
      const dto = { phone: '+584121234567', message: 'Hola' };
      const mockResponse = 'Respuesta del asistente';

      service.processMessageFromDoctor.mockResolvedValue(mockResponse);

      const result = await controller.processMessage(dto);

      expect(service.processMessageFromDoctor).toHaveBeenCalledWith(
        dto.phone,
        dto.message,
      );
      expect(result).toEqual({ success: true, response: mockResponse });
    });
  });
});
