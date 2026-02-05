import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './core/interceptors/response.interceptor';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { PrismaExceptionFilter } from './core/filters/prisma-exception.filter';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  app.setGlobalPrefix('v1');

  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (
      req.method === 'POST' &&
      req.originalUrl?.includes('twilio/webhook/whatsapp')
    ) {
      console.log(
        `[Webhook] POST recibido: ${req.originalUrl} | host=${req.get('host')} | x-forwarded-host=${req.get('x-forwarded-host')} | x-forwarded-proto=${req.get('x-forwarded-proto')}`,
      );
    }
    next();
  });

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

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Backend Tesis API')
    .setDescription(
      'API para el proyecto de grado - Sistema médico con integración de WhatsApp y OpenAI',
    )
    .setVersion('1.0')
    .addTag('Patients', 'Endpoints para gestión de pacientes')
    .addTag('Appointments', 'Endpoints para gestión de citas médicas')
    .addTag('Clinic Histories', 'Endpoints para historias clínicas')
    .addTag('OpenAI', 'Endpoints para integración con OpenAI')
    .addTag('Twilio WhatsApp', 'Endpoints para mensajería WhatsApp con Twilio')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Backend Tesis API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6 }
    `,
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  console.log(`Aplicación ejecutándose en: http://localhost:${port}`);
  console.log(
    `Documentación Swagger disponible en: http://localhost:${port}/api/docs`,
  );
}

void bootstrap();
