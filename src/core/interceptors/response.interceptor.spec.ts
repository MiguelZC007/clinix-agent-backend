import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';
import { ApiResponseDto } from '../responses/api-response.dto';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('debe envolver datos en ApiResponseDto', (done) => {
    const mockData = { id: 1, name: 'Test' };
    const mockExecutionContext = {} as never;
    const mockCallHandler = {
      handle: () => of(mockData),
    };

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe((result) => {
        expect(result).toBeInstanceOf(ApiResponseDto);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockData);
        expect(result.timestamp).toBeDefined();
        done();
      });
  });

  it('debe retornar ApiResponseDto sin modificar si ya es instancia', (done) => {
    const existingResponse = ApiResponseDto.ok({ id: 1 }, 'Custom message');
    const mockExecutionContext = {} as never;
    const mockCallHandler = {
      handle: () => of(existingResponse),
    };

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe((result) => {
        expect(result).toBe(existingResponse);
        expect(result.message).toBe('Custom message');
        done();
      });
  });

  it('debe manejar datos null', (done) => {
    const mockExecutionContext = {} as never;
    const mockCallHandler = {
      handle: () => of(null),
    };

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe((result) => {
        expect(result).toBeInstanceOf(ApiResponseDto);
        expect(result.data).toBeNull();
        done();
      });
  });

  it('debe manejar arrays', (done) => {
    const mockData = [{ id: 1 }, { id: 2 }];
    const mockExecutionContext = {} as never;
    const mockCallHandler = {
      handle: () => of(mockData),
    };

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe((result) => {
        expect(result).toBeInstanceOf(ApiResponseDto);
        expect(result.data).toEqual(mockData);
        expect(result.data).toHaveLength(2);
        done();
      });
  });
});
