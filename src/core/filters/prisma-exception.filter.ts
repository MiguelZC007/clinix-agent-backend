import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import {
  ErrorCode,
  ErrorMessages,
  ProblemDetailsDto,
} from '../responses/problem-details.dto';

type PrismaException =
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientValidationError
  | Prisma.PrismaClientInitializationError
  | Prisma.PrismaClientRustPanicError;

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: PrismaException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const mapped = this.mapException(exception);

    this.logger.error(
      `Prisma error -> status=${mapped.status} code=${mapped.code}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorInfo = this.getErrorInfoFromCode(mapped.code);
    const problemDetails = new ProblemDetailsDto({
      type: errorInfo.type,
      title: mapped.code,
      status: mapped.status,
      code: mapped.code,
      detail: mapped.code,
    });

    response.status(mapped.status).json(problemDetails);
  }

  private mapException(exception: PrismaException): {
    status: number;
    code: ErrorCode;
  } {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return { status: HttpStatus.CONFLICT, code: ErrorCode.CONFLICT };
      }
      if (exception.code === 'P2025') {
        return { status: HttpStatus.NOT_FOUND, code: ErrorCode.NOT_FOUND };
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { status: HttpStatus.BAD_REQUEST, code: ErrorCode.BAD_REQUEST };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: ErrorCode.UNKNOWN };
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
