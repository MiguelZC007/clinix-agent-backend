import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from 'src/prisma/__mocks__/prisma.service.mock';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let prisma: MockPrismaService;
  let jwtService: jest.Mocked<JwtService>;
  let reflector: jest.Mocked<Reflector>;

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    name: 'Juan',
    lastName: 'Pérez',
    phone: '+584241234567',
    patient: null,
    doctor: null,
  };

  const mockPayload = {
    sub: 'user-uuid',
    phone: '+584241234567',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const createMockContext = (headers: Record<string, string> = {}) => {
    const request = {
      headers: {
        authorization: headers.authorization || undefined,
      },
      user: undefined,
      token: undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    jwtService = module.get(JwtService);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('debe permitir acceso si la ruta es pública', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si no hay token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Token no proporcionado',
      );
    });

    it('debe lanzar UnauthorizedException si el token es inválido', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext({
        authorization: 'Bearer invalid-token',
      });
      jwtService.verifyAsync.mockRejectedValue(new Error('Token inválido'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Token inválido o expirado',
      );
    });

    it('debe lanzar UnauthorizedException si el token está revocado', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext({
        authorization: 'Bearer valid-token',
      });
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      prisma.revokedToken.findUnique.mockResolvedValue({
        id: 'revoked-token-uuid',
        token: 'valid-token',
        userId: 'user-uuid',
        revokedAt: new Date(),
        expiresAt: new Date(),
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow('Token revocado');
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext({
        authorization: 'Bearer valid-token',
      });
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      prisma.revokedToken.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Usuario no encontrado',
      );
    });

    it('debe permitir acceso si el token es válido y el usuario existe', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext({
        authorization: 'Bearer valid-token',
      });
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      prisma.revokedToken.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual(mockUser);
      expect(request.token).toBe('valid-token');
    });

    it('debe extraer el token correctamente del header Bearer', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext({
        authorization: 'Bearer my-token-123',
      });
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      prisma.revokedToken.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await guard.canActivate(context);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('my-token-123');
    });

    it('debe ignorar el tipo de autorización si no es Bearer', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext({
        authorization: 'Basic token123',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });
});
