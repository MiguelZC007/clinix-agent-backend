jest.mock('twilio', () => ({
  validateRequest: jest.fn(),
}));

const mockEnv = { TWILIO_AUTH_TOKEN: 'test-auth-token' };
jest.mock('src/core/config/environments', () => ({
  __esModule: true,
  get default() {
    return mockEnv;
  },
}));

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TwilioWebhookGuard } from './twilio-webhook.guard';
import twilio from 'twilio';

const validateRequest = twilio.validateRequest as jest.MockedFunction<
  typeof twilio.validateRequest
>;

type RequestLike = {
  header: (name: string) => string | undefined;
  get: (name: string) => string | undefined;
  protocol: string;
  originalUrl: string;
  body: Record<string, string>;
};

function createMockContext(overrides: Partial<RequestLike> = {}): ExecutionContext {
  const request: RequestLike = {
    header: (name: string) =>
      name === 'X-Twilio-Signature' ? 'signature-abc' : undefined,
    get: (name: string) => {
      if (name === 'host') return 'localhost:4000';
      if (name === 'x-forwarded-proto') return undefined;
      if (name === 'x-forwarded-host') return undefined;
      return undefined;
    },
    protocol: 'http',
    originalUrl: '/v1/twilio/webhook/whatsapp',
    body: { MessageSid: 'SM123', Body: 'test' },
    ...overrides,
  };
  return {
    switchToHttp: () => ({
      getRequest: <T = RequestLike>() => request as unknown as T,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('TwilioWebhookGuard', () => {
  let guard: TwilioWebhookGuard;

  beforeEach(async () => {
    mockEnv.TWILIO_AUTH_TOKEN = 'test-auth-token';
    guard = new TwilioWebhookGuard();
    validateRequest.mockReset();
  });

  it('debe lanzar ForbiddenException si TWILIO_AUTH_TOKEN no está configurado', () => {
    mockEnv.TWILIO_AUTH_TOKEN = '';
    const ctx = createMockContext();

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow(
      'twilio-webhook-validation-unavailable',
    );
  });

  it('debe lanzar ForbiddenException con twilio-webhook-signature-invalid cuando la firma es inválida', () => {
    validateRequest.mockReturnValue(false);
    const ctx = createMockContext();

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow(
      'twilio-webhook-signature-invalid',
    );
    expect(validateRequest).toHaveBeenCalledWith(
      'test-auth-token',
      'signature-abc',
      'http://localhost:4000/v1/twilio/webhook/whatsapp',
      { MessageSid: 'SM123', Body: 'test' },
    );
  });

  it('debe permitir acceso cuando la firma es válida', () => {
    validateRequest.mockReturnValue(true);
    const ctx = createMockContext();

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(validateRequest).toHaveBeenCalledWith(
      'test-auth-token',
      'signature-abc',
      'http://localhost:4000/v1/twilio/webhook/whatsapp',
      { MessageSid: 'SM123', Body: 'test' },
    );
  });

  it('debe usar x-forwarded-proto y x-forwarded-host cuando están presentes', () => {
    validateRequest.mockReturnValue(true);
    const ctx = createMockContext({
      get: (name: string) => {
        if (name === 'host') return 'internal:4000';
        if (name === 'x-forwarded-proto') return 'https';
        if (name === 'x-forwarded-host') return 'api.ejemplo.com';
        return undefined;
      },
      protocol: 'http',
      originalUrl: '/v1/twilio/webhook/whatsapp',
    });

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(validateRequest).toHaveBeenCalledWith(
      'test-auth-token',
      expect.any(String),
      'https://api.ejemplo.com/v1/twilio/webhook/whatsapp',
      expect.any(Object),
    );
  });
});
