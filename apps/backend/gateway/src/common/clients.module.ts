import { SERVICE_CLIENTS } from '@aletheia/backend-commons';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

/**
 * Registra los ClientProxy (Redis) compartidos por los feature-modules del gateway.
 * AuthModule mantiene su propio cliente AUTH para login/refresh/logout; aquí se publica
 * AUTH (para users.controller), CONTRACTS, WORKFLOW y DOCUMENTS de forma @Global, de modo
 * que cualquier controller pueda inyectarlos por su token sin reimportar.
 */
const SERVICES = [
  SERVICE_CLIENTS.AUTH,
  SERVICE_CLIENTS.CONTRACTS,
  SERVICE_CLIENTS.WORKFLOW,
  SERVICE_CLIENTS.DOCUMENTS,
] as const;

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync(
      SERVICES.map((name) => ({
        name,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: Number(config.get<string>('REDIS_PORT', '6379')),
          },
        }),
      })),
    ),
  ],
  exports: [ClientsModule],
})
export class ClientsRegistryModule {}
