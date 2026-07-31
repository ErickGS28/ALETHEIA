import { type RedisOptions, Transport } from '@nestjs/microservices';

/**
 * Opciones de transporte Redis compartidas por todos los microservicios
 * (como listener) y por el gateway (como cliente).
 */
export const redisTransportOptions = (): RedisOptions => ({
  transport: Transport.REDIS,
  options: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
});
