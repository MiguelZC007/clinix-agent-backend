import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from 'src/prisma/__mocks__/prisma.service.mock';
import { LoginDto } from './dto/login.dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: MockPrismaService;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    name: 'Juan',
    lastName: 'Pérez',
    phone: '+584241234567',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLoginDto: LoginDto = {
    phone: '+584241234567',
    password: 'password123',
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const mockJwtService = {
      signAsync: jest.fn(),
      decode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debe realizar login exitosamente con credenciales válidas', async () => {
      const mockToken = 'mock-jwt-token';
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue(mockToken);

      const result = await service.login(mockLoginDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe(mockToken);
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.phone).toBe(mockUser.phone);
      const findUniqueCalls = prisma.user.findUnique.mock.calls as Array<
        [unknown]
      >;
      expect(findUniqueCalls[0]?.[0]).toEqual({
        where: { phone: mockLoginDto.phone },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockLoginDto.password,
        mockUser.password,
      );
      const signAsyncCalls = jwtService.signAsync.mock.calls as Array<
        [unknown]
      >;
      expect(signAsyncCalls[0]?.[0]).toEqual({
        sub: mockUser.id,
        phone: mockUser.phone,
      });
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'invalid-credentials',
      );
    });

    it('debe lanzar UnauthorizedException si el usuario no tiene contraseña', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: null,
      });

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'user-without-password',
      );
    });

    it('debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        'invalid-credentials',
      );
    });
  });

  describe('logout', () => {
    it('debe revocar el token exitosamente', async () => {
      const mockToken = 'mock-jwt-token';
      const mockDecoded = { exp: Math.floor(Date.now() / 1000) + 3600 };
      jwtService.decode.mockReturnValue(mockDecoded);
      prisma.revokedToken.create.mockResolvedValue({
        id: 'revoked-token-uuid',
        token: mockToken,
        userId: 'user-uuid',
        revokedAt: new Date(),
        expiresAt: new Date(mockDecoded.exp * 1000),
      });

      await service.logout(mockToken, 'user-uuid');

      const decodeCalls = jwtService.decode.mock.calls as Array<[unknown]>;
      expect(decodeCalls[0]?.[0]).toBe(mockToken);
      const createCalls = prisma.revokedToken.create.mock.calls as Array<
        [unknown]
      >;
      const createArg = createCalls[0]?.[0] as
        | { data?: { token?: unknown; userId?: unknown; expiresAt?: unknown } }
        | undefined;
      expect(createArg?.data?.token).toBe(mockToken);
      expect(createArg?.data?.userId).toBe('user-uuid');
      expect(createArg?.data?.expiresAt).toEqual(expect.any(Date));
    });
  });

  describe('revokeToken', () => {
    it('debe llamar a logout', async () => {
      const mockToken = 'mock-jwt-token';
      const mockDecoded = { exp: Math.floor(Date.now() / 1000) + 3600 };
      jwtService.decode.mockReturnValue(mockDecoded);
      prisma.revokedToken.create.mockResolvedValue({
        id: 'revoked-token-uuid',
        token: mockToken,
        userId: 'user-uuid',
        revokedAt: new Date(),
        expiresAt: new Date(mockDecoded.exp * 1000),
      });

      await service.revokeToken(mockToken, 'user-uuid');

      expect(prisma.revokedToken.create).toHaveBeenCalled();
    });
  });

  describe('isTokenRevoked', () => {
    it('debe retornar true si el token está revocado', async () => {
      const mockToken = 'mock-jwt-token';
      prisma.revokedToken.findUnique.mockResolvedValue({
        id: 'revoked-token-uuid',
        token: mockToken,
        userId: 'user-uuid',
        revokedAt: new Date(),
        expiresAt: new Date(),
      });

      const result = await service.isTokenRevoked(mockToken);

      expect(result).toBe(true);
      expect(prisma.revokedToken.findUnique).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
    });

    it('debe retornar false si el token no está revocado', async () => {
      const mockToken = 'mock-jwt-token';
      prisma.revokedToken.findUnique.mockResolvedValue(null);

      const result = await service.isTokenRevoked(mockToken);

      expect(result).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('debe hashear la contraseña correctamente', async () => {
      const password = 'password123';
      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });
  });
});
