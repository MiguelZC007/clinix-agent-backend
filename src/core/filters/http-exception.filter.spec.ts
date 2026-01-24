import {
  ArgumentsHost,
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
  let mockResponse: MockResponse;
  let mockHost: ArgumentsHost;

  interface MockResponse {
    status: jest.MockedFunction<(status: number) => MockResponse>;
    json: jest.MockedFunction<(body: unknown) => void>;
  }

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    const json = jest.fn<void, [unknown]>();
    mockResponse = {
      status: jest.fn<MockResponse, [number]>(),
      json,
    };
    mockResponse.status.mockImplementation(() => mockResponse);

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      }),
    } as unknown as ArgumentsHost;
  });

  it('debe manejar BadRequestException con errores de validación', () => {
    const exception = new BadRequestException({
      message: ['email must be an email', 'name should not be empty'],
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalled();
    const body = mockResponse.json.mock.calls[0]?.[0] as {
      code?: unknown;
      status?: unknown;
      errors?: unknown;
    };
    expect(body.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(body.status).toBe(HttpStatus.BAD_REQUEST);
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: ErrorCode.INVALID_FIELD }),
        expect.objectContaining({ message: ErrorCode.REQUIRED_FIELD }),
      ]),
    );
  });

  it('debe manejar NotFoundException', () => {
    const exception = new NotFoundException(ErrorCode.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      }),
    );
  });

  it('debe manejar UnauthorizedException', () => {
    const exception = new UnauthorizedException(ErrorCode.UNAUTHENTICATED);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.UNAUTHENTICATED,
        status: HttpStatus.UNAUTHORIZED,
      }),
    );
  });

  it('debe manejar ForbiddenException', () => {
    const exception = new ForbiddenException(ErrorCode.UNAUTHORIZED);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.UNAUTHORIZED,
        status: HttpStatus.FORBIDDEN,
      }),
    );
  });

  it('debe manejar ConflictException', () => {
    const exception = new ConflictException(ErrorCode.CONFLICT);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.CONFLICT,
        status: HttpStatus.CONFLICT,
      }),
    );
  });

  it('debe incluir timestamp en la respuesta', () => {
    const exception = new BadRequestException('Error');

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalled();
    const body = mockResponse.json.mock.calls[0]?.[0] as {
      timestamp?: unknown;
    };
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('debe manejar mensaje string en exception', () => {
    const exception = new HttpException('Error simple', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'Error simple',
        detail: 'Error simple',
      }),
    );
  });
});
