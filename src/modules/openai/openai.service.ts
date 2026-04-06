import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { ErrorCode } from 'src/core/responses/problem-details.dto';
import OpenAI from 'openai';
import {
  ContextBudgetExceededError,
  ConversationService,
} from './conversation.service';
import { AppointmentService } from '../appointment/appointment.service';
import { ClinicHistoryService } from '../clinic-history/clinic-history.service';
import { CreateClinicHistoryDto } from '../clinic-history/dto/create-clinic-history.dto';
import { CreateClinicHistoryWithoutAppointmentDto } from '../clinic-history/dto/create-clinic-history-without-appointment.dto';
import type { AppointmentResponseDto } from '../appointment/dto/appointment-response.dto';
import environment from 'src/core/config/environments';
import { openaiTools } from './tool-definitions.service';
import { SYSTEM_PROMPT } from './system-prompt.service';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

type ChatCompletionTool = OpenAI.Chat.Completions.ChatCompletionTool;


const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(s: string | null | undefined): boolean {
  if (s == null || typeof s !== 'string') return false;
  return UUID_REGEX.test(s.trim());
}

export interface DoctorContext {
  doctorId: string;
}

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);


  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
    private readonly appointmentService: AppointmentService,
    private readonly clinicHistoryService: ClinicHistoryService,
  ) {
    if (
      !environment.OPENAI_API_KEY ||
      environment.OPENAI_API_KEY.trim() === ''
    ) {
      throw new Error(
        'OPENAI_API_KEY is not configured. Please set the OPENAI_API_KEY environment variable.',
      );
    }
    this.openai = new OpenAI({
      apiKey: environment.OPENAI_API_KEY,
    });
  }

  async processMessageFromDoctor(
    phoneNumber: string,
    userMessage: string,
    context?: DoctorContext,
  ): Promise<string> {
    const doctorId =
      context?.doctorId ?? (await this.resolveDoctorId(phoneNumber));

    const { conversation } =
      await this.conversationService.getOrCreateActiveConversation(
        doctorId,
        SYSTEM_PROMPT,
      );

    await this.conversationService.addMessage(
      conversation.id,
      'user',
      userMessage,
    );

    const assistantResponse = await this.sendChatCompletion(
      conversation.id,
      doctorId,
    );

    await this.conversationService.addMessage(
      conversation.id,
      'assistant',
      assistantResponse,
    );

    return assistantResponse;
  }

  async processMessageInConversation(
    doctorId: string,
    conversationId: string,
  ): Promise<string> {
    const assistantResponse = await this.sendChatCompletion(
      conversationId,
      doctorId,
    );

    await this.conversationService.addMessage(
      conversationId,
      'assistant',
      assistantResponse,
    );

    return assistantResponse;
  }

  private async resolveDoctorId(phoneNumber: string): Promise<string> {
    const doctorInfo =
      await this.conversationService.findDoctorByPhone(phoneNumber);
    if (!doctorInfo) {
      throw new NotFoundException('doctor-not-found-by-phone');
    }
    return doctorInfo.doctorId;
  }

  private async sendChatCompletion(
    conversationId: string,
    doctorId: string,
  ): Promise<string> {
    try {
      const preflight =
        await this.conversationService.preflightContextBudget(conversationId);

      const messages: ChatMessage[] = [
        { role: 'system', content: this.systemPrompt },
        ...preflight.messages,
      ];

      const response = await this.openai.chat.completions.create({
        model: environment.OPENAI_MODEL,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        tools: openaiTools,
        tool_choice: 'auto',
      });

      const assistantMessage = response.choices[0]?.message;

      if (
        assistantMessage?.tool_calls &&
        assistantMessage.tool_calls.length > 0
      ) {
        return this.handleToolCalls(conversationId, assistantMessage, doctorId);
      }

      return (
        assistantMessage?.content ||
        'No pude procesar tu solicitud. Por favor, intenta de nuevo.'
      );
    } catch (error) {
      if (error instanceof ContextBudgetExceededError) {
        return 'La conversación actual ya no entra de forma segura en el contexto del modelo. Empezá un hilo nuevo o acotá la consulta.';
      }

      throw error;
    }
  }

  private async handleToolCalls(
    conversationId: string,
    assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage,
    doctorId: string,
  ): Promise<string> {
    const TOOL_CALL_MAX_ROUNDS = 5;

    // Execute initial tool calls
    const toolResults = await this.executeToolCalls(
      assistantMessage.tool_calls || [],
      doctorId,
    );

    // Build messages for follow-up
    let pendingMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      [
        {
          role: 'assistant' as const,
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls,
        },
        ...toolResults,
      ];

    // Loop for multi-round tool calling (max 3 rounds)
    for (let round = 0; round < TOOL_CALL_MAX_ROUNDS; round++) {
      const preflight = await this.conversationService.preflightContextBudget(
        conversationId,
        this.toPendingMessages(pendingMessages),
      );

      const currentMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        [
          { role: 'system', content: this.systemPrompt },
          ...preflight.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          ...pendingMessages,
        ];

      const followUpResponse = await this.openai.chat.completions.create({
        model: environment.OPENAI_MODEL,
        messages: currentMessages,
        tools: openaiTools,
        tool_choice: 'auto',
      });

      const followUpMessage = followUpResponse.choices[0]?.message;

      // If no more tool_calls, return the content directly
      if (
        !followUpMessage?.tool_calls ||
        followUpMessage.tool_calls.length === 0
      ) {
        return followUpMessage?.content || 'Operación completada.';
      }

      // Execute new tool calls and append results
      const newToolResults = await this.executeToolCalls(
        followUpMessage.tool_calls,
        doctorId,
      );

      // Append assistant message with tool_calls and tool results
      pendingMessages = [
        ...pendingMessages,
        {
          role: 'assistant' as const,
          content: followUpMessage.content,
          tool_calls: followUpMessage.tool_calls,
        },
        ...newToolResults,
      ];
    }

    // Max rounds reached — find last message with non-null content
    for (let i = pendingMessages.length - 1; i >= 0; i--) {
      const msg = pendingMessages[i];
      if ('content' in msg && typeof msg.content === 'string' && msg.content) {
        return msg.content;
      }
    }
    return 'Operación completada.';
  }

  private toPendingMessages(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null;
    metadata?: string;
  }> {
    return messages.map((message) => {
      const role =
        message.role === 'developer' || message.role === 'function'
          ? 'assistant'
          : message.role;

      const metadata = this.serializePendingMessageMetadata(message);

      if (typeof message.content === 'string') {
        return { role, content: message.content, metadata };
      }

      if (Array.isArray(message.content)) {
        return {
          role,
          content: JSON.stringify(message.content),
          metadata,
        };
      }

      return { role, content: null, metadata };
    });
  }

  private serializePendingMessageMetadata(
    message: OpenAI.Chat.Completions.ChatCompletionMessageParam,
  ): string | undefined {
    const payload: Record<string, unknown> = {};

    if ('tool_calls' in message && Array.isArray(message.tool_calls)) {
      payload.tool_calls = message.tool_calls;
    }

    if ('tool_call_id' in message && typeof message.tool_call_id === 'string') {
      payload.tool_call_id = message.tool_call_id;
    }

    if ('name' in message && typeof message.name === 'string') {
      payload.name = message.name;
    }

    if ('refusal' in message && message.refusal != null) {
      payload.refusal = message.refusal;
    }

    return Object.keys(payload).length > 0
      ? JSON.stringify(payload)
      : undefined;
  }

  private async executeToolCalls(
    toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
    doctorId: string,
  ): Promise<Array<OpenAI.Chat.Completions.ChatCompletionToolMessageParam>> {
    const toolResults: Array<OpenAI.Chat.Completions.ChatCompletionToolMessageParam> =
      [];

    for (const toolCall of toolCalls) {
      if (toolCall.type !== 'function') continue;

      const functionName = toolCall.function.name;
      const functionArgs = this.safeParseJsonRecord(
        toolCall.function.arguments,
      );

      this.logger.debug(
        `Tool call input: ${functionName}`,
        this.sanitizeToolArgs(functionArgs),
      );

      let content: string;
      try {
        const result = await this.executeToolFunction(
          doctorId,
          functionName,
          functionArgs,
        );
        content = JSON.stringify(result);
        this.logger.debug(
          `Tool call output: ${functionName} success`,
          this.summarizeToolResult(result),
        );
      } catch (exception) {
        const { error, message } = this.mapToolErrorToMessage(exception);
        content = JSON.stringify({
          success: false,
          error,
          message,
        });
        this.logger.debug(`Tool call output: ${functionName} error`, {
          error,
          message,
        });
      }

      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        content,
      });
    }

    return toolResults;
  }

  private sanitizeToolArgs(
    args: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized = { ...args };
    if ('password' in sanitized) {
      sanitized.password = '[REDACTED]';
    }
    if ('email' in sanitized) {
      sanitized.email = '[REDACTED]';
    }
    if ('phone' in sanitized) {
      sanitized.phone = '[REDACTED]';
    }
    if ('name' in sanitized) {
      sanitized.name = '[REDACTED]';
    }
    if ('lastName' in sanitized) {
      sanitized.lastName = '[REDACTED]';
    }
    return sanitized;
  }

  private summarizeToolResult(result: unknown): string {
    if (result === null || result === undefined) {
      return 'null';
    }
    if (Array.isArray(result)) {
      return `array(${result.length})`;
    }
    if (typeof result === 'object') {
      const obj = result as Record<string, unknown>;
      if ('id' in obj && typeof obj.id === 'string') {
        return `object(id=${obj.id})`;
      }
      if ('success' in obj && obj.success === false && 'error' in obj) {
        return `error(${this.stringifyUnknown(obj.error)})`;
      }
      if ('formattedMessage' in obj) {
        return 'formattedMessage';
      }
      return `object(${Object.keys(obj).length} keys)`;
    }
    return this.stringifyUnknown(result);
  }

  private stringifyUnknown(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }

    return '';
  }

  private safeParseJsonRecord(json: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private mapToolErrorToMessage(exception: unknown): {
    error: string;
    message: string;
  } {
    const codeMap: Record<string, string> = {
      [ErrorCode.PATIENT_NOT_FOUND]:
        'El paciente no fue encontrado. Verifique que seleccionó un paciente de la lista.',
      'patient-number-not-found':
        'No se encontró un paciente con ese número. Verifique el número en la lista.',
      [ErrorCode.SPECIALTY_NOT_FOUND]:
        'La especialidad no fue encontrada. Verifique que seleccionó una especialidad de la lista.',
      'patient-not-owned-by-doctor':
        'No tiene acceso a ese paciente. Seleccione un paciente de la lista que le mostré.',
      [ErrorCode.APPOINTMENT_NOT_FOUND]: 'La cita no fue encontrada.',
      [ErrorCode.APPOINTMENT_CONFLICT]:
        'Ya existe una cita en ese horario. Elija otra fecha u hora.',
      [ErrorCode.INVALID_DATE_RANGE]:
        'La hora de fin debe ser posterior a la hora de inicio.',
      [ErrorCode.APPOINTMENT_ALREADY_CANCELLED]: 'La cita ya está cancelada.',
      'appointment-cannot-cancel-completed':
        'No se puede cancelar una cita ya completada.',
      'appointment-use-id-not-name':
        'Use el id (UUID) del resultado de search_patients y list_specialties, no el nombre. Llame a esas funciones y pase el campo "id" en create_appointment.',
      'appointment-patient-ambiguous':
        'Varios pacientes coinciden con ese nombre. Use search_patients y pase el id del paciente elegido.',
      'appointment-specialty-ambiguous':
        'Varias especialidades coinciden. Use list_specialties y pase el id de la especialidad elegida.',
      'validation-error-patient-and-specialty-required-without-appointment':
        'Indique el número del paciente y el código de la especialidad (uno por vez si lo prefiere).',
      [ErrorCode.CONFLICT]: 'Conflicto con los datos. Intente de nuevo.',
      [ErrorCode.NOT_FOUND]: 'Recurso no encontrado.',
      [ErrorCode.BAD_REQUEST]: 'Datos inválidos. Verifique e intente de nuevo.',
    };

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const code =
        typeof response === 'object' &&
        response !== null &&
        'message' in response
          ? Array.isArray((response as { message: unknown }).message)
            ? this.stringifyUnknown(
                (response as { message: unknown[] }).message[0],
              )
            : this.stringifyUnknown((response as { message: unknown }).message)
          : this.stringifyUnknown(response);
      const message = codeMap[code] ?? codeMap[ErrorCode.BAD_REQUEST];
      return { error: code, message };
    }

    const errMsg =
      exception && typeof exception === 'object' && 'message' in exception
        ? this.stringifyUnknown((exception as Error).message)
        : '';
    if (errMsg && codeMap[errMsg]) {
      return { error: errMsg, message: codeMap[errMsg] };
    }

    return {
      error: ErrorCode.UNKNOWN,
      message: 'Ocurrió un error al procesar la solicitud. Intente de nuevo.',
    };
  }

  private formatAppointmentsForWhatsApp(
    appointments: AppointmentResponseDto[],
  ): string {
    if (appointments.length === 0) {
      return 'No hay consultas para hoy.';
    }
    const lines = appointments.map((apt, i) => {
      const date = new Date(apt.startAppointment);
      const dateStr = date.toISOString().slice(0, 10);
      const timeStr = date.toISOString().slice(11, 16);
      const patientName = `${apt.patient.name} ${apt.patient.lastName}`;
      const reason = apt.reason || '-';
      const status = apt.status;
      return `${i + 1}. ${dateStr} ${timeStr} | ${patientName} | ${reason} | ${status}`;
    });
    return lines.join('\n');
  }

  private async ensurePatientExists(patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException(ErrorCode.PATIENT_NOT_FOUND);
    }
  }

  private normalizeForNameMatch(s: string): string {
    return s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private async resolvePatientIdByName(
    doctorId: string,
    nameInput: string,
  ): Promise<string> {
    if (
      nameInput == null ||
      typeof nameInput !== 'string' ||
      nameInput.trim() === ''
    ) {
      throw new BadRequestException('appointment-use-id-not-name');
    }
    const normalized = this.normalizeForNameMatch(nameInput);
    const patients = await this.prisma.patient.findMany({
      where: {
        registeredByDoctorId: doctorId,
        OR: [
          {
            user: {
              name: { contains: normalized, mode: 'insensitive' },
            },
          },
          {
            user: {
              lastName: { contains: normalized, mode: 'insensitive' },
            },
          },
        ],
      },
      include: { user: { select: { name: true, lastName: true } } },
    });
    const matches = patients.filter((p) => {
      const full = this.normalizeForNameMatch(
        `${p.user.name} ${p.user.lastName}`,
      );
      const nameNorm = this.normalizeForNameMatch(p.user.name);
      const lastNameNorm = this.normalizeForNameMatch(p.user.lastName);
      return (
        full === normalized ||
        full.includes(normalized) ||
        nameNorm.includes(normalized) ||
        lastNameNorm.includes(normalized)
      );
    });
    if (matches.length === 1) return matches[0].id;
    if (matches.length === 0) {
      throw new BadRequestException('appointment-use-id-not-name');
    }
    throw new BadRequestException('appointment-patient-ambiguous');
  }

  private async resolvePatientIdByNumber(
    doctorId: string,
    numberInput: string,
  ): Promise<string | null> {
    const n = Number.parseInt(numberInput.trim(), 10);
    if (Number.isNaN(n) || n < 1) return null;
    const patients = await this.prisma.patient.findMany({
      where: { patientNumber: n, registeredByDoctorId: doctorId },
      select: { id: true },
    });
    if (patients.length === 1) return patients[0].id;
    return null;
  }

  private async resolveSpecialtyIdByName(nameInput: string): Promise<string> {
    if (
      nameInput == null ||
      typeof nameInput !== 'string' ||
      nameInput.trim() === ''
    ) {
      throw new BadRequestException('appointment-use-id-not-name');
    }
    const specialties = await this.prisma.specialty.findMany({
      where: {
        name: {
          equals: nameInput.trim(),
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });
    if (specialties.length === 1) return specialties[0].id;
    if (specialties.length === 0) {
      const byContains = await this.prisma.specialty.findMany({
        where: {
          name: {
            contains: nameInput.trim(),
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      if (byContains.length === 1) return byContains[0].id;
      throw new BadRequestException('appointment-use-id-not-name');
    }
    throw new BadRequestException('appointment-specialty-ambiguous');
  }

  private async mapCreateClinicHistoryArgsToDto(
    args: Record<string, unknown>,
  ): Promise<CreateClinicHistoryDto> {
    const diagnostics = Array.isArray(args.diagnostics)
      ? (args.diagnostics as unknown[]).map((d: unknown) => {
          const o = d as Record<string, unknown>;
          return {
            name: this.stringifyUnknown(o?.name),
            description: this.stringifyUnknown(o?.description),
          };
        })
      : [];
    const physicalExams = Array.isArray(args.physicalExams)
      ? (args.physicalExams as unknown[]).map((p: unknown) => {
          const o = p as Record<string, unknown>;
          return {
            name: this.stringifyUnknown(o?.name),
            description: this.stringifyUnknown(o?.description),
          };
        })
      : [];
    const vitalSigns = Array.isArray(args.vitalSigns)
      ? (args.vitalSigns as unknown[]).map((v: unknown) => {
          const o = v as Record<string, unknown>;
          return {
            name: this.stringifyUnknown(o?.name),
            value: this.stringifyUnknown(o?.value),
            unit: this.stringifyUnknown(o?.unit),
            measurement: this.stringifyUnknown(o?.measurement),
            description:
              o?.description != null
                ? this.stringifyUnknown(o.description)
                : undefined,
          };
        })
      : [];
    const prescriptionRaw = args.prescription;
    let prescription:
      | {
          name: string;
          description: string;
          medications: Array<{
            name: string;
            quantity: number;
            unit: string;
            frequency: string;
            duration: string;
            indications: string;
            administrationRoute: string;
            description?: string;
          }>;
        }
      | undefined;
    if (
      prescriptionRaw != null &&
      typeof prescriptionRaw === 'object' &&
      Array.isArray((prescriptionRaw as Record<string, unknown>).medications)
    ) {
      const pr = prescriptionRaw as Record<string, unknown>;
      const meds = (pr.medications as unknown[]).map((m: unknown) => {
        const med = m as Record<string, unknown>;
        const q = med.quantity;
        const quantity =
          typeof q === 'number' ? Math.floor(q) : Math.floor(Number(q));
        return {
          name: this.stringifyUnknown(med.name),
          quantity: Number.isFinite(quantity) ? quantity : 0,
          unit: this.stringifyUnknown(med.unit),
          frequency: this.stringifyUnknown(med.frequency),
          duration: this.stringifyUnknown(med.duration),
          indications: this.stringifyUnknown(med.indications),
          administrationRoute: this.stringifyUnknown(med.administrationRoute),
          description:
            med.description != null
              ? this.stringifyUnknown(med.description)
              : undefined,
        };
      });
      prescription = {
        name: this.stringifyUnknown(pr.name),
        description: this.stringifyUnknown(pr.description),
        medications: meds,
      };
    }
    const symptoms = Array.isArray(args.symptoms)
      ? (args.symptoms as unknown[]).map((s: unknown) =>
          this.stringifyUnknown(s),
        )
      : typeof args.symptoms === 'string'
        ? [args.symptoms]
        : [];
    const plain = {
      appointmentId: this.stringifyUnknown(args.appointmentId),
      consultationReason: this.stringifyUnknown(args.consultationReason),
      symptoms,
      treatment: this.stringifyUnknown(args.treatment),
      diagnostics,
      physicalExams,
      vitalSigns,
      ...(prescription != null ? { prescription } : {}),
    };
    const dto = plainToInstance(CreateClinicHistoryDto, plain);
    const errors = await validate(dto);
    if (errors.length > 0) {
      const messages = errors.flatMap((e) =>
        e.constraints ? Object.values(e.constraints) : [],
      );
      throw new BadRequestException({
        message: messages.length > 0 ? messages : 'validation-error',
      });
    }
    return dto;
  }

  private async mapCreateClinicHistoryArgsToDtoWithoutAppointment(
    args: Record<string, unknown>,
    patientId: string,
    specialtyId: string,
    patientNumber?: number,
    specialtyCode?: number,
  ): Promise<CreateClinicHistoryWithoutAppointmentDto> {
    const diagnostics = Array.isArray(args.diagnostics)
      ? (args.diagnostics as unknown[]).map((d: unknown) => {
          const o = d as Record<string, unknown>;
          return {
            name: this.stringifyUnknown(o?.name),
            description: this.stringifyUnknown(o?.description),
          };
        })
      : [];
    const physicalExams = Array.isArray(args.physicalExams)
      ? (args.physicalExams as unknown[]).map((p: unknown) => {
          const o = p as Record<string, unknown>;
          return {
            name: this.stringifyUnknown(o?.name),
            description: this.stringifyUnknown(o?.description),
          };
        })
      : [];
    const vitalSigns = Array.isArray(args.vitalSigns)
      ? (args.vitalSigns as unknown[]).map((v: unknown) => {
          const o = v as Record<string, unknown>;
          return {
            name: this.stringifyUnknown(o?.name),
            value: this.stringifyUnknown(o?.value),
            unit: this.stringifyUnknown(o?.unit),
            measurement: this.stringifyUnknown(o?.measurement),
            description:
              o?.description != null
                ? this.stringifyUnknown(o.description)
                : undefined,
          };
        })
      : [];
    const prescriptionRaw = args.prescription;
    let prescription:
      | {
          name: string;
          description: string;
          medications: Array<{
            name: string;
            quantity: number;
            unit: string;
            frequency: string;
            duration: string;
            indications: string;
            administrationRoute: string;
            description?: string;
          }>;
        }
      | undefined;
    if (
      prescriptionRaw != null &&
      typeof prescriptionRaw === 'object' &&
      Array.isArray((prescriptionRaw as Record<string, unknown>).medications)
    ) {
      const pr = prescriptionRaw as Record<string, unknown>;
      const meds = (pr.medications as unknown[]).map((m: unknown) => {
        const med = m as Record<string, unknown>;
        const q = med.quantity;
        const quantity =
          typeof q === 'number' ? Math.floor(q) : Math.floor(Number(q));
        return {
          name: this.stringifyUnknown(med.name),
          quantity: Number.isFinite(quantity) ? quantity : 0,
          unit: this.stringifyUnknown(med.unit),
          frequency: this.stringifyUnknown(med.frequency),
          duration: this.stringifyUnknown(med.duration),
          indications: this.stringifyUnknown(med.indications),
          administrationRoute: this.stringifyUnknown(med.administrationRoute),
          description:
            med.description != null
              ? this.stringifyUnknown(med.description)
              : undefined,
        };
      });
      prescription = {
        name: this.stringifyUnknown(pr.name),
        description: this.stringifyUnknown(pr.description),
        medications: meds,
      };
    }
    const symptoms = Array.isArray(args.symptoms)
      ? (args.symptoms as unknown[]).map((s: unknown) =>
          this.stringifyUnknown(s),
        )
      : typeof args.symptoms === 'string'
        ? [args.symptoms]
        : [];
    const useNumbers =
      patientNumber != null &&
      specialtyCode != null &&
      Number.isInteger(patientNumber) &&
      Number.isInteger(specialtyCode);
    const plain = {
      ...(useNumbers
        ? { patientNumber, specialtyCode }
        : { patientId, specialtyId }),
      consultationReason: this.stringifyUnknown(args.consultationReason),
      symptoms,
      treatment: this.stringifyUnknown(args.treatment),
      diagnostics,
      physicalExams,
      vitalSigns,
      ...(prescription != null ? { prescription } : {}),
    };
    const dto = plainToInstance(
      CreateClinicHistoryWithoutAppointmentDto,
      plain,
    );
    const errors = await validate(dto);
    if (errors.length > 0) {
      const messages = errors.flatMap((e) =>
        e.constraints ? Object.values(e.constraints) : [],
      );
      throw new BadRequestException({
        message: messages.length > 0 ? messages : 'validation-error',
      });
    }
    return dto;
  }

  private async executeToolFunction(
    doctorId: string,
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (functionName) {
      case 'register_patient': {
        const rawPassword = args.password as string | undefined;
        const hashedPassword = rawPassword
          ? await bcrypt.hash(rawPassword, environment.SALT_ROUND)
          : undefined;
        return this.prisma.user.create({
          data: {
            email: args.email as string,
            name: args.name as string,
            lastName: args.lastName as string,
            phone: args.phone as string,
            password: hashedPassword,
            patient: {
              create: {
                registeredByDoctorId: doctorId,
                gender: args.gender as string | undefined,
                birthDate: args.birthDate
                  ? new Date(args.birthDate as string)
                  : undefined,
                allergies: [],
                medications: [],
                medicalHistory: [],
                familyHistory: [],
              },
            },
          },
          include: { patient: true },
        });
      }

      case 'list_specialties':
        return this.prisma.specialty.findMany({
          select: { id: true, name: true, specialtyCode: true },
          orderBy: { name: 'asc' },
        });

      case 'search_patients': {
        const query = args.query as string | undefined;
        const searchTerm =
          typeof query === 'string' && query.trim() !== ''
            ? query.trim()
            : null;
        const patients = await this.prisma.patient.findMany({
          where: {
            registeredByDoctorId: doctorId,
            ...(searchTerm && {
              OR: [
                {
                  user: {
                    name: { contains: searchTerm, mode: 'insensitive' },
                  },
                },
                {
                  user: {
                    lastName: { contains: searchTerm, mode: 'insensitive' },
                  },
                },
              ],
            }),
          },
          take: 50,
          orderBy: [{ patientNumber: 'asc' }, { user: { lastName: 'asc' } }],
          include: {
            user: { select: { name: true, lastName: true } },
          },
        });
        return patients.map((p) => ({
          id: p.id,
          patientNumber: p.patientNumber,
          name: p.user.name,
          lastName: p.user.lastName,
        }));
      }

      case 'get_patient': {
        const patient = await this.prisma.patient.findUnique({
          where: { id: args.patientId as string },
          include: {
            user: {
              select: { name: true, lastName: true, email: true, phone: true },
            },
          },
        });
        if (!patient) {
          throw new NotFoundException(ErrorCode.PATIENT_NOT_FOUND);
        }
        if (patient.registeredByDoctorId !== doctorId) {
          throw new ForbiddenException('patient-not-owned-by-doctor');
        }
        return patient;
      }

      case 'update_patient': {
        const patient = await this.prisma.patient.findUnique({
          where: { id: args.patientId as string },
        });
        if (!patient) {
          throw new NotFoundException(ErrorCode.PATIENT_NOT_FOUND);
        }
        if (patient.registeredByDoctorId !== doctorId) {
          throw new ForbiddenException('patient-not-owned-by-doctor');
        }
        const rawPassword = args.password as string | undefined;
        const hashedPassword = rawPassword
          ? await bcrypt.hash(rawPassword, environment.SALT_ROUND)
          : undefined;
        return this.prisma.patient.update({
          where: { id: args.patientId as string },
          data: {
            gender: args.gender as string | undefined,
            birthDate: args.birthDate
              ? new Date(args.birthDate as string)
              : undefined,
            user: {
              update: {
                email: args.email as string | undefined,
                name: args.name as string | undefined,
                lastName: args.lastName as string | undefined,
                phone: args.phone as string | undefined,
                password: hashedPassword,
              },
            },
          },
          include: { user: true },
        });
      }

      case 'delete_patient': {
        const patientToDelete = await this.prisma.patient.findUnique({
          where: { id: args.patientId as string },
        });
        if (!patientToDelete) {
          throw new NotFoundException(ErrorCode.PATIENT_NOT_FOUND);
        }
        if (patientToDelete.registeredByDoctorId !== doctorId) {
          throw new ForbiddenException('patient-not-owned-by-doctor');
        }
        return this.prisma.patient.delete({
          where: { id: args.patientId as string },
        });
      }

      case 'get_patient_antecedents': {
        const patientForAntecedents = await this.prisma.patient.findUnique({
          where: { id: args.patientId as string },
        });
        if (!patientForAntecedents) {
          throw new NotFoundException(ErrorCode.PATIENT_NOT_FOUND);
        }
        if (patientForAntecedents.registeredByDoctorId !== doctorId) {
          throw new ForbiddenException('patient-not-owned-by-doctor');
        }
        return this.prisma.patient.findUnique({
          where: { id: args.patientId as string },
          select: {
            allergies: true,
            medications: true,
            medicalHistory: true,
            familyHistory: true,
          },
        });
      }

      case 'update_patient_antecedents': {
        const patientForAntecedentsUpdate =
          await this.prisma.patient.findUnique({
            where: { id: args.patientId as string },
          });
        if (!patientForAntecedentsUpdate) {
          throw new NotFoundException(ErrorCode.PATIENT_NOT_FOUND);
        }
        if (patientForAntecedentsUpdate.registeredByDoctorId !== doctorId) {
          throw new ForbiddenException('patient-not-owned-by-doctor');
        }
        return this.prisma.patient.update({
          where: { id: args.patientId as string },
          data: {
            allergies: args.allergies as string[] | undefined,
            medications: args.medications as string[] | undefined,
            medicalHistory: args.medicalHistory as string[] | undefined,
            familyHistory: args.familyHistory as string[] | undefined,
          },
        });
      }

      case 'create_appointment': {
        let patientId = args.patientId as string;
        let specialtyId = args.specialtyId as string;
        const startAppointment = new Date(args.startAppointment as string);
        const endAppointment = new Date(args.endAppointment as string);

        if (!isUUID(patientId)) {
          const numericOnly = /^\d+$/.test(String(patientId).trim());
          const byNumber = await this.resolvePatientIdByNumber(
            doctorId,
            patientId,
          );
          if (byNumber) {
            patientId = byNumber;
          } else if (numericOnly) {
            throw new BadRequestException('patient-number-not-found');
          } else {
            patientId = await this.resolvePatientIdByName(doctorId, patientId);
          }
        }
        if (!isUUID(specialtyId)) {
          specialtyId = await this.resolveSpecialtyIdByName(specialtyId);
        }

        const patient = await this.prisma.patient.findUnique({
          where: { id: patientId },
        });
        if (!patient) {
          throw new NotFoundException(ErrorCode.PATIENT_NOT_FOUND);
        }

        const specialty = await this.prisma.specialty.findUnique({
          where: { id: specialtyId },
        });
        if (!specialty) {
          throw new NotFoundException(ErrorCode.SPECIALTY_NOT_FOUND);
        }

        if (startAppointment >= endAppointment) {
          throw new BadRequestException(ErrorCode.INVALID_DATE_RANGE);
        }

        return this.prisma.appointment.create({
          data: {
            patientId,
            doctorId,
            specialtyId,
            reason: args.reason as string | undefined,
            startAppointment,
            endAppointment,
            status: 'pending',
          },
        });
      }

      case 'get_all_appointments':
        return this.prisma.appointment.findMany({
          where: { doctorId },
          include: {
            patient: {
              include: { user: { select: { name: true, lastName: true } } },
            },
            doctor: {
              include: { user: { select: { name: true, lastName: true } } },
            },
          },
        });

      case 'get_appointment': {
        const appointment = await this.prisma.appointment.findUnique({
          where: { id: args.appointmentId as string },
          include: {
            patient: {
              include: { user: { select: { name: true, lastName: true } } },
            },
            doctor: {
              include: { user: { select: { name: true, lastName: true } } },
            },
          },
        });
        if (!appointment) {
          throw new NotFoundException('appointment-not-found');
        }
        if (appointment.doctorId !== doctorId) {
          throw new ForbiddenException('appointment-not-owned-by-doctor');
        }
        return appointment;
      }

      case 'update_appointment': {
        const existingAppointment = await this.prisma.appointment.findUnique({
          where: { id: args.appointmentId as string },
        });
        if (!existingAppointment) {
          throw new NotFoundException('appointment-not-found');
        }
        if (existingAppointment.doctorId !== doctorId) {
          throw new ForbiddenException('appointment-not-owned-by-doctor');
        }
        return this.prisma.appointment.update({
          where: { id: args.appointmentId as string },
          data: {
            startAppointment: args.startAppointment
              ? new Date(args.startAppointment as string)
              : undefined,
            endAppointment: args.endAppointment
              ? new Date(args.endAppointment as string)
              : undefined,
            status: args.status as string | undefined,
            reason: args.reason as string | undefined,
          },
        });
      }

      case 'cancel_appointment': {
        const appointmentToCancel = await this.prisma.appointment.findUnique({
          where: { id: args.appointmentId as string },
        });
        if (!appointmentToCancel) {
          throw new NotFoundException('appointment-not-found');
        }
        if (appointmentToCancel.doctorId !== doctorId) {
          throw new ForbiddenException('appointment-not-owned-by-doctor');
        }
        return this.prisma.appointment.update({
          where: { id: args.appointmentId as string },
          data: { status: 'cancelled' },
        });
      }

      case 'get_patient_appointments':
        return this.prisma.appointment.findMany({
          where: {
            patientId: args.patientId as string,
            doctorId,
          },
          include: {
            doctor: {
              include: { user: { select: { name: true, lastName: true } } },
            },
          },
        });

      case 'getTodaysAppointments': {
        const dateArg = typeof args.date === 'string' ? args.date : undefined;
        const todaysAppointments =
          await this.appointmentService.findTodaysByDoctor(doctorId, dateArg);
        const formatted =
          this.formatAppointmentsForWhatsApp(todaysAppointments);
        return { formattedMessage: formatted };
      }

      case 'create_clinic_history': {
        const appointmentId =
          typeof args.appointmentId === 'string' && args.appointmentId.trim()
            ? args.appointmentId
            : undefined;
        if (appointmentId) {
          const appointment = await this.prisma.appointment.findUnique({
            where: { id: appointmentId },
          });
          if (!appointment) {
            throw new NotFoundException('appointment-not-found');
          }
          if (appointment.doctorId !== doctorId) {
            throw new ForbiddenException('appointment-not-owned-by-doctor');
          }
          const dto = await this.mapCreateClinicHistoryArgsToDto(args);
          return this.clinicHistoryService.create(dto, doctorId);
        }
        const patientIdArg =
          typeof args.patientId === 'string' && args.patientId.trim()
            ? args.patientId
            : undefined;
        const specialtyIdArg =
          typeof args.specialtyId === 'string' && args.specialtyId.trim()
            ? args.specialtyId
            : undefined;
        const patientNumberArg =
          typeof args.patientNumber === 'number' &&
          Number.isInteger(args.patientNumber)
            ? args.patientNumber
            : undefined;
        const specialtyCodeArg =
          typeof args.specialtyCode === 'number' &&
          Number.isInteger(args.specialtyCode)
            ? args.specialtyCode
            : undefined;

        const useNumbers =
          patientNumberArg !== undefined && specialtyCodeArg !== undefined;
        const useIds =
          patientIdArg !== undefined && specialtyIdArg !== undefined;

        if (useNumbers && useIds) {
          throw new BadRequestException(
            'validation-error-use-either-ids-or-numbers-not-both',
          );
        }
        if (!useNumbers && !useIds) {
          throw new BadRequestException(
            'validation-error-patient-and-specialty-required-without-appointment',
          );
        }

        let resolvedPatientId: string;
        let resolvedSpecialtyId: string;

        if (useNumbers) {
          const patientByNumber = await this.prisma.patient.findUnique({
            where: { patientNumber: patientNumberArg },
          });
          if (!patientByNumber) {
            throw new NotFoundException('patient-not-found');
          }
          if (patientByNumber.registeredByDoctorId !== doctorId) {
            throw new ForbiddenException('patient-not-owned-by-doctor');
          }
          const specialtyByCode = await this.prisma.specialty.findUnique({
            where: { specialtyCode: specialtyCodeArg },
          });
          if (!specialtyByCode) {
            throw new NotFoundException('specialty-not-found');
          }
          resolvedPatientId = patientByNumber.id;
          resolvedSpecialtyId = specialtyByCode.id;
        } else {
          resolvedPatientId = patientIdArg as string;
          resolvedSpecialtyId = specialtyIdArg as string;
          const patientById = await this.prisma.patient.findUnique({
            where: { id: resolvedPatientId },
          });
          if (!patientById) {
            throw new NotFoundException('patient-not-found');
          }
          if (patientById.registeredByDoctorId !== doctorId) {
            throw new ForbiddenException('patient-not-owned-by-doctor');
          }
        }

        const dtoWithoutAppointment =
          await this.mapCreateClinicHistoryArgsToDtoWithoutAppointment(
            args,
            resolvedPatientId,
            resolvedSpecialtyId,
            patientNumberArg,
            specialtyCodeArg,
          );
        return this.clinicHistoryService.createWithoutAppointment(
          doctorId,
          dtoWithoutAppointment,
        );
      }

      case 'get_all_clinic_histories':
        return this.prisma.clinicHistory.findMany({
          where: { doctorId },
          include: {
            patient: {
              include: { user: { select: { name: true, lastName: true } } },
            },
            diagnostics: true,
            vitalSigns: true,
          },
        });

      case 'get_clinic_history': {
        const clinicHistory = await this.prisma.clinicHistory.findUnique({
          where: { id: args.clinicHistoryId as string },
          include: {
            patient: {
              include: { user: { select: { name: true, lastName: true } } },
            },
            diagnostics: true,
            physicalExams: true,
            vitalSigns: true,
            prescription: { include: { prescriptionMedications: true } },
          },
        });
        if (!clinicHistory) {
          throw new NotFoundException('clinic-history-not-found');
        }
        if (clinicHistory.doctorId !== doctorId) {
          throw new ForbiddenException('clinic-history-not-owned-by-doctor');
        }
        return clinicHistory;
      }

      case 'get_patient_clinic_histories':
        return this.prisma.clinicHistory.findMany({
          where: {
            patientId: args.patientId as string,
            doctorId,
          },
          include: {
            diagnostics: true,
            vitalSigns: true,
            prescription: true,
          },
        });

      default:
        return { error: `Función no reconocida: ${functionName}` };
    }
  }

  getSystemPrompt(): string {
    return SYSTEM_PROMPT;
  }
}
