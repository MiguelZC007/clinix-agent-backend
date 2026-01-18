import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
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
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let problemDetails: ProblemDetailsDto;

    if (exception instanceof BadRequestException) {
      const validationErrors = this.extractValidationErrors(exceptionResponse);
      const errorInfo = ErrorMessages[ErrorCode.VAL_001];

      problemDetails = new ProblemDetailsDto({
        type: errorInfo.type,
        title: errorInfo.title,
        status,
        code: ErrorCode.VAL_001,
        detail: 'Los datos enviados no son válidos',
        errors: validationErrors,
      });
    } else {
      const errorCode = this.getErrorCodeFromStatus(status);
      const errorInfo = ErrorMessages[errorCode] || {
        type: 'https://api.example.com/errors/unknown',
        title: 'Error desconocido',
      };

      problemDetails = new ProblemDetailsDto({
        type: errorInfo.type,
        title: errorInfo.title,
        status,
        code: errorCode,
        detail: this.getDetailMessage(exceptionResponse),
      });
    }

    response.status(status).json(problemDetails);
  }

  private extractValidationErrors(
    exceptionResponse: string | object,
  ): ValidationErrorDto[] {
    if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      const messages = (exceptionResponse as { message: string | string[] }).message;

      if (Array.isArray(messages)) {
        return messages.map((msg) => ({
          field: this.extractFieldFromMessage(msg),
          message: msg,
        }));
      }

      return [
        {
          field: 'unknown',
          message: messages,
        },
      ];
    }

    return [];
  }

  private extractFieldFromMessage(message: string): string {
    const match = message.match(/^(\w+)/);
    return match ? match[1] : 'unknown';
  }

  private getDetailMessage(exceptionResponse: string | object): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      const message = (exceptionResponse as { message: string | string[] }).message;
      return Array.isArray(message) ? message.join(', ') : message;
    }

    return 'Ha ocurrido un error';
  }

  private getErrorCodeFromStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VAL_001;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.AUTH_001;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.AUTH_002;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RES_001;
      case HttpStatus.CONFLICT:
        return ErrorCode.RES_002;
      default:
        return ErrorCode.VAL_001;
    }
  }
}
