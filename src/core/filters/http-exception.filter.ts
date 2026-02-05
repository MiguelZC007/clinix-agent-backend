import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ProblemDetailsDto,
  ValidationErrorDto,
  ErrorCode,
  ErrorMessages,
} from '../responses/problem-details.dto';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus() as HttpStatus;
    const exceptionResponse = exception.getResponse();

    let problemDetails: ProblemDetailsDto;

    if (exception instanceof BadRequestException) {
      const code = ErrorCode.VALIDATION_ERROR;
      const validationErrors = this.extractValidationErrors(exceptionResponse);
      if (validationErrors.length > 0) {
        this.logger.warn(
          `Validación fallida: ${JSON.stringify(validationErrors)} | response=${JSON.stringify(exceptionResponse)}`,
        );
      }
      const errorInfo = this.getErrorInfoFromCode(code);

      problemDetails = new ProblemDetailsDto({
        type: errorInfo.type,
        title: code,
        status,
        code,
        detail: code,
        errors: validationErrors,
      });
    } else {
      const codeFromException =
        this.getCodeFromExceptionResponse(exceptionResponse);
      const code = codeFromException ?? this.getFallbackCodeFromStatus(status);
      const errorInfo = this.getErrorInfoFromCode(code);

      problemDetails = new ProblemDetailsDto({
        type: errorInfo.type,
        title: code,
        status,
        code,
        detail: code,
      });
    }

    response.status(status).json(problemDetails);
  }

  private getErrorInfoFromCode(code: string): { type: string; title: string } {
    const messages = ErrorMessages as Record<
      string,
      { type: string; title: string }
    >;
    return (
      messages[code] ?? {
        type: 'https://api.example.com/errors/unknown',
        title: 'Error desconocido',
      }
    );
  }

  private extractValidationErrors(
    exceptionResponse: string | object,
  ): ValidationErrorDto[] {
    if (
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const messages = (exceptionResponse as { message: string | string[] })
        .message;

      if (Array.isArray(messages)) {
        return messages.map((msg) => ({
          field: this.extractFieldFromMessage(msg),
          message: this.getValidationErrorCodeFromMessage(msg),
        }));
      }

      return [
        {
          field: 'unknown',
          message: this.getValidationErrorCodeFromMessage(messages),
        },
      ];
    }

    return [];
  }

  private extractFieldFromMessage(message: string): string {
    const match = message.match(/^(\w+)/);
    return match ? match[1] : 'unknown';
  }

  private getValidationErrorCodeFromMessage(message: string): string {
    const normalized = message.toLowerCase();
    if (
      normalized.includes('should not be empty') ||
      normalized.includes('must not be empty') ||
      normalized.includes('no debe estar vacío') ||
      normalized.includes('no debe estar vacio') ||
      normalized.includes('es requerido') ||
      normalized.includes('is required')
    ) {
      return ErrorCode.REQUIRED_FIELD;
    }
    return ErrorCode.INVALID_FIELD;
  }

  private getCodeFromExceptionResponse(
    exceptionResponse: string | object,
  ): string | undefined {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as { message: string | string[] })
        .message;
      return typeof message === 'string' ? message : undefined;
    }

    return undefined;
  }

  private getFallbackCodeFromStatus(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHENTICATED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      default:
        return ErrorCode.UNKNOWN;
    }
  }
}
