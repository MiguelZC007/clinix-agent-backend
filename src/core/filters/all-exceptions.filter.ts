import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ErrorCode,
  ErrorMessages,
  ProblemDetailsDto,
} from '../responses/problem-details.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error('Unhandled exception', stack);

    const code = ErrorCode.UNKNOWN;
    const errorInfo = this.getErrorInfoFromCode(code);
    const problemDetails = new ProblemDetailsDto({
      type: errorInfo.type,
      title: code,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code,
      detail: code,
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(problemDetails);
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
}
