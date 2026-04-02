import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from 'src/core/enum/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (
    user: Record<string, unknown> | null,
    roles?: Role[],
  ): ExecutionContext => {
    const handler = () => {};
    const classRef = () => {};

    if (roles) {
      Reflect.defineMetadata(ROLES_KEY, roles, handler);
    } else {
      Reflect.deleteMetadata(ROLES_KEY, handler);
    }

    return {
      getHandler: () => handler,
      getClass: () => classRef as unknown as new () => unknown,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe retornar true si el usuario tiene el rol requerido', () => {
    const context = createMockContext(
      { id: 'admin-uuid' },
      [Role.ADMIN],
    );

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('debe lanzar ForbiddenException si el usuario no tiene el rol requerido', () => {
    const context = createMockContext(
      { id: 'doctor-uuid', doctor: { id: 'doc-1' } },
      [Role.ADMIN],
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe retornar true si no hay metadata @Roles() (sin restricción)', () => {
    const context = createMockContext(
      { id: 'user-uuid' },
      undefined,
    );

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('debe retornar true para ADMIN cuando se requiere ADMIN', () => {
    const context = createMockContext(
      { id: 'admin-uuid' },
      [Role.ADMIN],
    );

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('debe retornar true para DOCTOR cuando se requiere DOCTOR', () => {
    const context = createMockContext(
      { id: 'doctor-uuid', doctor: { id: 'doc-1' } },
      [Role.DOCTOR],
    );

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('debe lanzar ForbiddenException si no hay usuario en el request', () => {
    const context = createMockContext(null, [Role.ADMIN]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe lanzar ForbiddenException para DOCTOR cuando se requiere ADMIN', () => {
    const context = createMockContext(
      { id: 'doctor-uuid', doctor: { id: 'doc-1' } },
      [Role.ADMIN],
    );

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe retornar true si el rol del usuario está entre múltiples roles requeridos', () => {
    const context = createMockContext(
      { id: 'doctor-uuid', doctor: { id: 'doc-1' } },
      [Role.ADMIN, Role.DOCTOR],
    );

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});
