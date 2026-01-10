import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import OpenAI from 'openai';
import { MessageOpenaiDto } from './dto/message-openai.dto';
import environment from 'src/core/config/environments';

@Injectable()
export class OpenaiService {
  private instructions: string =
    'You are a medical assistant responsible for tasks such as registering, updating, and consulting patient medical records.';
  private readonly openai: OpenAI;

  constructor(private readonly prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: environment.OPENAI_API_KEY,
    });
  }

  async conversation(doctorId: string, sendMessageDto: MessageOpenaiDto) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        doctorId: doctorId,
      },
    });
    return this.sendMessage(this.instructions, sendMessageDto);
  }

  async sendMessage(instructions: string, sendMessageDto: MessageOpenaiDto) {
    const response: OpenAI.Responses.Response =
      await this.openai.responses.create({
        model: environment.OPENAI_MODEL,
        instructions: instructions,
        prompt: {
          id: '1',
          version: '1.0.0',
          variables: {},
        },
        tools: [
          {
            type: 'function',
            name: 'register_patient',
            description: 'Register a new patient',
            parameters: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'The name of the patient',
                },
                lastName: {
                  type: 'string',
                  description: 'The last name of the patient',
                },
                age: {
                  type: 'number',
                  description: 'The age of the patient',
                },
                gender: {
                  type: 'string',
                  description: 'The gender of the patient',
                },
                allergies: {
                  type: 'array',
                  description: 'The allergies of the patient',
                  items: {
                    type: 'string',
                  },
                },
                medications: {
                  type: 'array',
                  description: 'The medications of the patient',
                  items: {
                    type: 'string',
                  },
                },
                medicalHistory: {
                  type: 'array',
                  description: 'The medical history of the patient',
                  items: {
                    type: 'string',
                  },
                },
                familyHistory: {
                  type: 'array',
                  description: 'The family history of the patient',
                  items: {
                    type: 'string',
                  },
                },
              },
              required: [
                'name',
                'lastName',
                'age',
                'gender',
                'allergies',
                'medications',
                'medicalHistory',
                'familyHistory',
              ],
            },
            strict: true,
          },
        ],
        tool_choice: 'auto',
      });

    return response;
  }
}
