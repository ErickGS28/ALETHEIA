import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import { throwError } from 'rxjs';

/**
 * Filtro global de los microservicios (contexto RPC/Redis).
 *
 * Las HttpException lanzadas dentro de un @MessagePattern (NotFound, Forbidden, BadRequest…)
 * se pierden al cruzar el transporte: por defecto NestJS las degrada a un error genérico.
 * Este filtro las normaliza a `{ statusCode, message }` para que el gateway pueda reconstruir
 * el status HTTP correcto (ver RpcErrorInterceptor).
 */
@Catch()
export class MicroserviceExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, _host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      return throwError(() => ({
        statusCode: exception.getStatus(),
        message: exception.message,
      }));
    }
    const message = exception instanceof Error ? exception.message : 'Error interno del servidor';
    return throwError(() => ({ statusCode: 500, message }));
  }
}
