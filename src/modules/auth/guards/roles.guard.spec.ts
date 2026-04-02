import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { IS_ADMIN_KEY } from '../decorators/is-admin.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockContext = (isAdminRequired = false, user?: { isAdmin?: boolean }) => {
    const request = { user };
    return {
      switchToHttp: () => ({
        getRequest: <T = typeof request>() => request as unknown as T,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('debe permitir acceso si la ruta no requiere admin', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext(false, { isAdmin: false });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('debe permitir acceso si no hay metadata de admin', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockContext(false, { isAdmin: false });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('debe permitir acceso si el usuario es admin', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext(true, { isAdmin: true });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('debe lanzar ForbiddenException si el usuario no es admin', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext(true, { isAdmin: false });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('forbidden-admin-only');
    });

    it('debe lanzar ForbiddenException si no hay usuario', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext(true, undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('debe verificar metadata en handler y clase', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext(true, { isAdmin: true });

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_ADMIN_KEY,
        [context.getHandler(), context.getClass()],
      );
    });
  });
});
