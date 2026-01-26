import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;

  type MockAuthService = {
    login: jest.MockedFunction<
      (this: void, loginDto: LoginDto) => Promise<LoginResponse>
    >;
    logout: jest.MockedFunction<
      (this: void, token: string, userId: string) => Promise<void>
    >;
  };

  let service: MockAuthService;

  const mockLoginResponse = {
    accessToken: 'mock-jwt-token',
    user: {
      id: 'user-uuid',
      name: 'Juan',
      lastName: 'Pérez',
      phone: '+584241234567',
      email: 'test@example.com',
    },
  };

  const mockLoginDto: LoginDto = {
    phone: '+584241234567',
    password: 'password123',
  };

  const mockRequest = {
    user: {
      id: 'user-uuid',
      email: 'test@example.com',
      name: 'Juan',
      lastName: 'Pérez',
      phone: '+584241234567',
    },
    token: 'mock-jwt-token',
  };

  beforeEach(async () => {
    const mockService: MockAuthService = {
      login: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debe llamar a authService.login con el DTO correcto', async () => {
      service.login.mockResolvedValue(mockLoginResponse as LoginResponse);

      const result = await controller.login(mockLoginDto);

      expect(service.login).toHaveBeenCalledWith(mockLoginDto);
      expect(result).toEqual(mockLoginResponse);
    });

    it('debe propagar UnauthorizedException si las credenciales son inválidas', async () => {
      service.login.mockRejectedValue(
        new UnauthorizedException('invalid-credentials'),
      );

      await expect(controller.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('debe llamar a authService.logout con el token y userId del request', async () => {
      service.logout.mockResolvedValue(undefined);

      const result = await controller.logout(
        mockRequest as unknown as {
          user: {
            id: string;
            email: string;
            name: string;
            lastName: string;
            phone: string;
          };
          token: string;
        },
      );

      expect(service.logout).toHaveBeenCalledWith(
        mockRequest.token,
        mockRequest.user.id,
      );
      expect(result).toEqual({ message: 'Sesión cerrada correctamente' });
    });
  });
});
