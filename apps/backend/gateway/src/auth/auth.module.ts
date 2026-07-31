import { SERVICE_CLIENTS } from '@aletheia/backend-commons';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICE_CLIENTS.AUTH,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: Number(config.get<string>('REDIS_PORT', '6379')),
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController],
})
export class AuthModule {}
