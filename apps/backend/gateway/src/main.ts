import {
  HttpExceptionFilter,
  RpcErrorInterceptor,
  TransformInterceptor,
} from '@aletheia/backend-commons';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Los orígenes permitidos vienen del entorno: cada despliegue (VPS, AWS, local)
  // sirve la app desde un dominio distinto. Sin esto el navegador rechaza el login
  // en cualquier sitio que no sea localhost.
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [
        'http://localhost:4000',
        'http://localhost:4001',
        'http://localhost:4002',
        'http://localhost:4003',
        'http://localhost:4004',
        'http://localhost:4005',
        'http://localhost:4006',
        'http://localhost:4007',
      ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RpcErrorInterceptor(), new TransformInterceptor());

  const config = new DocumentBuilder()
    .setTitle('ALETHEIA CLM API')
    .setDescription('API Gateway REST — Contract Lifecycle Management')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.APP_PORT ?? 3000;
  await app.listen(port);
  console.log(`🚪 Gateway en http://localhost:${port} · Swagger en /api/docs`);
}

bootstrap();
