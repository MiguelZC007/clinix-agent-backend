import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { AllExceptionsFilter } from 'src/core/filters/all-exceptions.filter';
import { HttpExceptionFilter } from 'src/core/filters/http-exception.filter';
import { PrismaExceptionFilter } from 'src/core/filters/prisma-exception.filter';
import { ResponseInterceptor } from 'src/core/interceptors/response.interceptor';
import { PrismaService } from 'src/prisma/prisma.service';

describe('Conversations API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let doctorId: string;
  let doctorUserId: string;
  let specialtyId: string;
  let conversationId: string;
  let httpServer: Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(
      new AllExceptionsFilter(),
      new PrismaExceptionFilter(),
      new HttpExceptionFilter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await setupFixture();
  }, 30000);

  afterAll(async () => {
    await prisma.message.deleteMany({
      where: { conversation: { doctorId } },
    });
    await prisma.conversation.deleteMany({ where: { doctorId } });
    await prisma.doctor.deleteMany({ where: { id: doctorId } });
    await prisma.user.deleteMany({ where: { id: doctorUserId } });
    await prisma.specialty.deleteMany({ where: { id: specialtyId } });
    await app.close();
  }, 30000);

  async function setupFixture(): Promise<void> {
    const timestamp = Date.now();
    specialtyId = `e2e-conversation-specialty-${timestamp}`;

    await prisma.specialty.create({
      data: {
        id: specialtyId,
        name: 'Medicina General Conversaciones E2E',
      },
    });

    const hashedPassword = await bcrypt.hash('test123', 10);
    const user = await prisma.user.create({
      data: {
        email: `doctor-conversations-${timestamp}@test.com`,
        name: 'Dra. API',
        lastName: 'Conversaciones',
        phone: `+58426${timestamp.toString().slice(-7)}`,
        password: hashedPassword,
        doctor: {
          create: {
            specialtyId,
            licenseNumber: `LIC-CONV-${timestamp}`,
          },
        },
      },
      include: { doctor: true },
    });

    doctorUserId = user.id;
    doctorId = user.doctor!.id;

    const loginResponse = await request(httpServer)
      .post('/v1/auth/login')
      .send({ phone: user.phone, password: 'test123' })
      .expect(201);

    const body = loginResponse.body as {
      success?: boolean;
      data?: { accessToken?: string };
    };
    accessToken = body.data?.accessToken ?? '';

    if (!accessToken) {
      throw new Error('No se pudo obtener el token JWT para las pruebas E2E');
    }
  }

  it('crea una conversación y persiste un override válido con budget coherente', async () => {
    const createResponse = await request(httpServer)
      .post('/v1/conversations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    const createBody = createResponse.body as {
      success?: boolean;
      data?: {
        id?: string;
        doctorId?: string;
        contextTokenLimit?: number;
        contextTokenLimitOverride?: number | null;
      };
    };

    expect(createBody.success).toBe(true);
    expect(createBody.data?.id).toBeDefined();
    expect(createBody.data?.doctorId).toBe(doctorId);
    expect(createBody.data?.contextTokenLimitOverride).toBeNull();
    expect(createBody.data?.contextTokenLimit).toBeGreaterThan(0);

    conversationId = createBody.data!.id!;

    const patchResponse = await request(httpServer)
      .patch(`/v1/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ contextTokenLimitOverride: 32000 })
      .expect(200);

    const patchBody = patchResponse.body as {
      success?: boolean;
      data?: {
        id?: string;
        contextTokenLimit?: number;
        contextTokensUsed?: number;
        contextTokenLimitOverride?: number | null;
      };
    };

    expect(patchBody.success).toBe(true);
    expect(patchBody.data?.id).toBe(conversationId);
    expect(patchBody.data?.contextTokenLimitOverride).toBe(32000);
    expect(patchBody.data?.contextTokenLimit).toBe(32000);
    expect(patchBody.data?.contextTokensUsed).toBeGreaterThanOrEqual(0);

    const persistedConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    expect(persistedConversation).not.toBeNull();
    expect(persistedConversation?.contextTokenLimitOverride).toBe(32000);
    expect(persistedConversation?.doctorId).toBe(doctorId);
  });

  it('rechaza un override inválido y mantiene el valor persistido sin cambios', async () => {
    const rejectedResponse = await request(httpServer)
      .patch(`/v1/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ contextTokenLimitOverride: 1000 })
      .expect(400);

    const rejectedBody = rejectedResponse.body as {
      status?: number;
      code?: string;
      detail?: string | string[];
    };

    expect(rejectedBody.status).toBe(400);
    expect(rejectedBody.code).toBeDefined();

    const persistedConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    expect(persistedConversation?.contextTokenLimitOverride).toBe(32000);

    const getResponse = await request(httpServer)
      .get(`/v1/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const getBody = getResponse.body as {
      success?: boolean;
      data?: {
        id?: string;
        contextTokenLimit?: number;
        contextTokensUsed?: number;
        contextTokenLimitOverride?: number | null;
      };
    };

    expect(getBody.success).toBe(true);
    expect(getBody.data?.id).toBe(conversationId);
    expect(getBody.data?.contextTokenLimitOverride).toBe(32000);
    expect(getBody.data?.contextTokenLimit).toBe(32000);
    expect(getBody.data?.contextTokensUsed).toBeGreaterThanOrEqual(0);
  });
});
