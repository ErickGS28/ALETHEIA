import { MicroserviceExceptionFilter, redisTransportOptions } from '@aletheia/backend-commons';
import { NestFactory } from '@nestjs/core';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    redisTransportOptions(),
  );
  app.useGlobalFilters(new MicroserviceExceptionFilter());
  await app.listen();
  console.log('🔄 workflow-service escuchando vía Redis');
}

bootstrap();
