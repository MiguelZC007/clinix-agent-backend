import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseInterceptor } from 'src/core/interceptors/response.interceptor';
import { AllExceptionsFilter } from 'src/core/filters/all-exceptions.filter';
import { HttpExceptionFilter } from 'src/core/filters/http-exception.filter';
import { PrismaExceptionFilter } from 'src/core/filters/prisma-exception.filter';

describe('ClinicHistories (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testSpecialtyId: string;
  let testDoctorUserId: string;

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

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await setupTestData();
  }, 30000);

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  }, 30000);

  async function setupTestData() {
    const timestamp = Date.now();
    testSpecialtyId = `e2e-specialty-ch-${timestamp}`;
    await prisma.specialty.create({
      data: {
        id: testSpecialtyId,
        name: 'Medicina General E2E',
      },
    });

    const hashedPassword = await bcrypt.hash('test123', 10);
    const testUser = await prisma.user.create({
      data: {
        email: `doctor-ch-e2e-${timestamp}@test.com`,
        name: 'Dr. E2E',
        lastName: 'ClinicHistories',
        phone: `+58424${timestamp.toString().slice(-7)}`,
        password: hashedPassword,
        doctor: {
          create: {
            specialtyId: testSpecialtyId,
            licenseNumber: `LIC-E2E-${timestamp}`,
          },
        },
      },
      include: { doctor: true },
    });
    testDoctorUserId = testUser.id;

    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ phone: testUser.phone, password: 'test123' });
    const body = loginRes.body as {
      success?: boolean;
      data?: { accessToken?: string };
    };
    accessToken = body.data?.accessToken ?? '';
    if (!accessToken) {
      throw new Error('Failed to get accessToken from login');
    }
  }

  async function cleanupTestData() {
    const doctor = await prisma.doctor.findFirst({
      where: { userId: testDoctorUserId },
    });
    if (doctor) {
      await prisma.doctor.delete({ where: { id: doctor.id } });
    }
    await prisma.user.deleteMany({ where: { id: testDoctorUserId } });
    await prisma.specialty.deleteMany({ where: { id: testSpecialtyId } });
  }

  describe('GET /v1/clinic-histories', () => {
    it('debe retornar 200 y forma paginada con page y pageSize', () => {
      return request(app.getHttpServer())
        .get('/v1/clinic-histories')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success?: boolean;
            data?: {
              items?: unknown[];
              page?: number;
              pageSize?: number;
              total?: number;
              totalPages?: number;
            };
            timestamp?: string;
          };
          expect(body.success).toBe(true);
          expect(body.data).toBeDefined();
          expect(Array.isArray(body.data?.items)).toBe(true);
          expect(body.data?.page).toBe(1);
          expect(body.data?.pageSize).toBe(10);
          expect(typeof body.data?.total).toBe('number');
          expect(typeof body.data?.totalPages).toBe('number');
          expect(body.timestamp).toBeDefined();
        });
    });

    it('debe retornar 400 cuando pageSize excede el máximo', () => {
      return request(app.getHttpServer())
        .get('/v1/clinic-histories')
        .query({ page: 1, pageSize: 101 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400)
        .expect((res) => {
          const body = res.body as { status?: number; code?: string };
          expect(body.status).toBe(400);
          expect(body.code).toBeDefined();
        });
    });

    it('debe retornar 200 con query param search', () => {
      return request(app.getHttpServer())
        .get('/v1/clinic-histories')
        .query({ page: 1, pageSize: 10, search: 'dolor' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success?: boolean;
            data?: { items?: unknown[]; page?: number; pageSize?: number };
          };
          expect(body.success).toBe(true);
          expect(body.data).toBeDefined();
          expect(Array.isArray(body.data?.items)).toBe(true);
          expect(body.data?.page).toBe(1);
          expect(body.data?.pageSize).toBe(10);
        });
    });

    it('debe retornar 200 con query params dateFrom y dateTo', () => {
      return request(app.getHttpServer())
        .get('/v1/clinic-histories')
        .query({
          page: 1,
          pageSize: 10,
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            success?: boolean;
            data?: { items?: unknown[]; total?: number; totalPages?: number };
          };
          expect(body.success).toBe(true);
          expect(body.data).toBeDefined();
          expect(typeof body.data?.total).toBe('number');
          expect(typeof body.data?.totalPages).toBe('number');
        });
    });

    it('debe retornar 400 cuando patientId no es UUID', () => {
      return request(app.getHttpServer())
        .get('/v1/clinic-histories')
        .query({ patientId: 'not-a-uuid' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400)
        .expect((res) => {
          const body = res.body as { status?: number; code?: string };
          expect(body.status).toBe(400);
          expect(body.code).toBeDefined();
        });
    });

    it('debe retornar 401 cuando no hay Authorization', () => {
      return request(app.getHttpServer())
        .get('/v1/clinic-histories')
        .query({ page: 1, pageSize: 10 })
        .expect(401)
        .expect((res) => {
          const body = res.body as { status?: number };
          expect(body.status).toBe(401);
        });
    });
  });
});
