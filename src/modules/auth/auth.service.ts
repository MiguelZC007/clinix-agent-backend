import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { TwilioService } from '../twilio/twilio.service';

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    lastName: string;
    phone: string;
    email: string;
  };
}

const OTP_TTL_MS = 600_000;
const OTP_CACHE_PREFIX = 'otp:';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private twilioService: TwilioService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { phone: loginDto.phone },
    });

    if (!user) {
      throw new UnauthorizedException('invalid-credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('user-without-password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('invalid-credentials');
    }

    const payload = { sub: user.id, phone: user.phone };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
      },
    };
  }

  async logout(token: string, userId: string): Promise<void> {
    const decoded: unknown = this.jwtService.decode(token);
    const exp = this.getExpFromDecodedToken(decoded);
    const expiresAt = new Date(exp * 1000);

    await this.prisma.revokedToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  async revokeToken(token: string, userId: string): Promise<void> {
    await this.logout(token, userId);
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const revokedToken = await this.prisma.revokedToken.findUnique({
      where: { token },
    });
    return !!revokedToken;
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async forgotPassword(phone: string): Promise<{ message: string }> {
    const normalizedPhone = phone.trim();
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    const genericMessage =
      'Si el número está registrado, recibirás un código por WhatsApp en los próximos minutos.';
    if (!user) {
      return { message: genericMessage };
    }
    const code = String(Math.floor(100_000 + Math.random() * 900_000));
    const cacheKey = `${OTP_CACHE_PREFIX}${normalizedPhone}`;
    await this.cache.set(cacheKey, code, OTP_TTL_MS);
    const whatsappBody = `Tu código de recuperación Clinix es: ${code}. Válido por 10 minutos.`;
    try {
      await this.twilioService.sendDirectMessage(normalizedPhone, whatsappBody);
    } catch {
      await this.cache.del(cacheKey);
      return { message: genericMessage };
    }
    return { message: genericMessage };
  }

  async resetPassword(
    phone: string,
    code: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('passwords-do-not-match');
    }
    const normalizedPhone = phone.trim();
    const cacheKey = `${OTP_CACHE_PREFIX}${normalizedPhone}`;
    const storedCode = await this.cache.get<string>(cacheKey);
    if (!storedCode || storedCode !== code) {
      throw new BadRequestException('invalid-or-expired-otp');
    }
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    if (!user) {
      throw new BadRequestException('invalid-or-expired-otp');
    }
    const hashedPassword = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    await this.cache.del(cacheKey);
    return { message: 'Contraseña actualizada correctamente' };
  }

  private getExpFromDecodedToken(decoded: unknown): number {
    if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
      const exp = (decoded as { exp?: unknown }).exp;
      if (typeof exp === 'number') {
        return exp;
      }
    }
    throw new UnauthorizedException('token-invalid-or-expired');
  }
}
