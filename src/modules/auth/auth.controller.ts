import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    lastName: string;
    phone: string;
  };
  token: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión con número de celular y contraseña',
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Juan',
            lastName: 'Pérez',
            phone: '+584241234567',
            email: 'juan@ejemplo.com',
          },
        },
        timestamp: '2026-01-20T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Solicitar código OTP por WhatsApp para recuperar contraseña',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada (mensaje genérico)',
    schema: {
      example: {
        success: true,
        data: {
          message:
            'Si el número está registrado, recibirás un código por WhatsApp en los próximos minutos.',
        },
        timestamp: '2026-01-20T10:30:00.000Z',
      },
    },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.phone);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({
    summary: 'Restablecer contraseña con código OTP recibido por WhatsApp',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada correctamente',
    schema: {
      example: {
        success: true,
        data: { message: 'Contraseña actualizada correctamente' },
        timestamp: '2026-01-20T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'OTP inválido o expirado / contraseñas no coinciden' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.phone,
      dto.code,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cerrar sesión y revocar el token actual' })
  @ApiResponse({
    status: 200,
    description: 'Logout exitoso',
    schema: {
      example: {
        success: true,
        data: { message: 'Sesión cerrada correctamente' },
        timestamp: '2026-01-20T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async logout(@Req() req: AuthenticatedRequest) {
    await this.authService.logout(req.token, req.user.id);
    return { message: 'Sesión cerrada correctamente' };
  }
}
