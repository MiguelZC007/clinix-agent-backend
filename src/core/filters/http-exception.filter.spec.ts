import {
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ErrorCode } from '../responses/problem-details.dto';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockHost: {
    switchToHttp: jest.Mock;
  };

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      }),
    };
  });

  it('debe manejar BadRequestException con errores de validación', () => {
    const exception = new BadRequestException({
      message: ['email must be an email', 'name should not be empty'],
    });

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.VAL_001,
        status: HttpStatus.BAD_REQUEST,
        errors: expect.arrayContaining([
          expect.objectContaining({ message: 'email must be an email' }),
          expect.objectContaining({ message: 'name should not be empty' }),
        ]),
      }),
    );
  });

  it('debe manejar NotFoundException', () => {
    const exception = new NotFoundException('Recurso no encontrado');

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.RES_001,
        status: HttpStatus.NOT_FOUND,
      }),
    );
  });

  it('debe manejar UnauthorizedException', () => {
    const exception = new UnauthorizedException('No autenticado');

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.AUTH_001,
        status: HttpStatus.UNAUTHORIZED,
      }),
    );
  });

  it('debe manejar ForbiddenException', () => {
    const exception = new ForbiddenException('No autorizado');

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.AUTH_002,
        status: HttpStatus.FORBIDDEN,
      }),
    );
  });

  it('debe manejar ConflictException', () => {
    const exception = new ConflictException('Recurso duplicado');

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.RES_002,
        status: HttpStatus.CONFLICT,
      }),
    );
  });

  it('debe incluir timestamp en la respuesta', () => {
    const exception = new BadRequestException('Error');

    filter.catch(exception, mockHost as never);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
      }),
    );
  });

  it('debe manejar mensaje string en exception', () => {
    const exception = new HttpException('Error simple', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost as never);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'Error simple',
      }),
    );
  });
});
