import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomBytes } from 'crypto';

const TOKEN_EXPIRY_MINUTES = 30;
const TOKEN_BYTES = 32;

export interface WhatsAppSessionResult {
  authToken: string;
  expiresAt: Date;
}

@Injectable()
export class AuthSessionService {
  private readonly logger = new Logger(AuthSessionService.name);

  constructor(private readonly prisma: PrismaService) { }

  async getOrCreateSession(
    phoneNumber: string,
    doctorId: string,
  ): Promise<WhatsAppSessionResult> {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    const now = new Date();

    const existing = await this.prisma.whatsAppAuthSession.findUnique({
      where: { phoneNumber: normalized },
    });

    if (existing && existing.authTokenExpiresAt > now) {
      await this.prisma.whatsAppAuthSession.update({
        where: { phoneNumber: normalized },
        data: { lastMessageAt: now },
      });
      return {
        authToken: existing.authToken,
        expiresAt: existing.authTokenExpiresAt,
      };
    }

    const authToken = this.generateSecureToken();
    const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.whatsAppAuthSession.upsert({
      where: { phoneNumber: normalized },
      create: {
        phoneNumber: normalized,
        doctorId,
        authToken,
        authTokenExpiresAt: expiresAt,
        lastMessageAt: now,
      },
      update: {
        doctorId,
        authToken,
        authTokenExpiresAt: expiresAt,
        lastMessageAt: now,
      },
    });

    return { authToken, expiresAt };
  }

  async touch(phoneNumber: string): Promise<void> {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    await this.prisma.whatsAppAuthSession.updateMany({
      where: { phoneNumber: normalized },
      data: { lastMessageAt: new Date() },
    });
  }

  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/^whatsapp:/i, '').trim();
  }

  private generateSecureToken(): string {
    return randomBytes(TOKEN_BYTES).toString('hex');
  }
}
