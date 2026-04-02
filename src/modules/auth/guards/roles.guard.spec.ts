import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../../../core/decorators/roles.decorator';
import { Role } from '../../../core/enum/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockContext = (requiredRoles?: Role[], user?: { role?: Role }) => {
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
    it('debe permitir acceso si no hay metadata de roles', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockContext(undefined, { role: Role.PATIENT });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('debe permitir acceso si el usuario tiene el rol requerido', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
      const context = createMockContext([Role.ADMIN], { role: Role.ADMIN });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('debe lanzar ForbiddenException si el usuario no tiene el rol requerido', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
      const context = createMockContext([Role.ADMIN], { role: Role.PATIENT });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('user-not-authorized');
    });

    it('debe lanzar ForbiddenException si no hay usuario', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
      const context = createMockContext([Role.ADMIN], undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('debe verificar metadata en handler y clase', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
      const context = createMockContext([Role.ADMIN], { role: Role.ADMIN });

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );
    });
  });
});
