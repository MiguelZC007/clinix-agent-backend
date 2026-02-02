import { AuthSessionService } from './auth-session.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('AuthSessionService', () => {
  let service: AuthSessionService;
  let mockPrisma: {
    whatsAppAuthSession: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      whatsAppAuthSession: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockImplementation(({ create }) =>
          Promise.resolve({
            authToken: create.authToken,
            authTokenExpiresAt: create.authTokenExpiresAt,
          }),
        ),
        update: jest.fn().mockResolvedValue(undefined),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new AuthSessionService(
      mockPrisma as unknown as PrismaService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create new session when none exists', async () => {
    const result = await service.getOrCreateSession(
      'whatsapp:+584241234567',
      'doctor-uuid',
    );

    expect(mockPrisma.whatsAppAuthSession.findUnique).toHaveBeenCalledWith({
      where: { phoneNumber: '+584241234567' },
    });
    expect(mockPrisma.whatsAppAuthSession.upsert).toHaveBeenCalled();
    expect(result.authToken).toBeDefined();
    expect(result.authToken.length).toBeGreaterThan(0);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should reuse token when session exists and not expired', async () => {
    const existingToken = 'existing-token-abc';
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    mockPrisma.whatsAppAuthSession.findUnique.mockResolvedValueOnce({
      phoneNumber: '+584241234567',
      authToken: existingToken,
      authTokenExpiresAt: expiresAt,
    });

    const result = await service.getOrCreateSession(
      'whatsapp:+584241234567',
      'doctor-uuid',
    );

    expect(result.authToken).toBe(existingToken);
    expect(result.expiresAt).toEqual(expiresAt);
    expect(mockPrisma.whatsAppAuthSession.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.whatsAppAuthSession.update).toHaveBeenCalledWith({
      where: { phoneNumber: '+584241234567' },
      data: { lastMessageAt: expect.any(Date) },
    });
  });

  it('should create new token when session expired', async () => {
    const expiredAt = new Date(Date.now() - 60 * 1000);
    mockPrisma.whatsAppAuthSession.findUnique.mockResolvedValueOnce({
      phoneNumber: '+584241234567',
      authToken: 'old-token',
      authTokenExpiresAt: expiredAt,
    });

    const result = await service.getOrCreateSession(
      '+584241234567',
      'doctor-uuid',
    );

    expect(mockPrisma.whatsAppAuthSession.upsert).toHaveBeenCalled();
    expect(result.authToken).toBeDefined();
    expect(result.authToken).not.toBe('old-token');
  });
});
