import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { OpenaiService } from './openai.service';

interface ProcessMessageDto {
  phone: string;
  message: string;
}

@ApiTags('OpenAI')
@Controller('openai')
export class OpenaiController {
  constructor(private readonly openaiService: OpenaiService) {}

  @Post('message')
  @ApiOperation({ summary: 'Procesar mensaje del médico via API' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', example: '+584121234567' },
        message: { type: 'string', example: 'Hola, necesito registrar un paciente' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Mensaje procesado correctamente' })
  async processMessage(@Body() data: ProcessMessageDto) {
    const response = await this.openaiService.processMessageFromDoctor(
      data.phone,
      data.message,
    );
    return { success: true, response };
  }
}
