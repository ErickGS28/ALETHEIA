import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, catchError, throwError } from 'rxjs';

/**
 * Interceptor global del gateway: reconstruye el status HTTP a partir del error normalizado
 * `{ statusCode, message }` que emiten los microservicios (ver MicroserviceExceptionFilter).
 * Así un Forbidden del State Machine llega al cliente como 403, no como 500.
 * Los fallos de transporte (Redis caído, sin statusCode) caen a 500.
 */
@Injectable()
export class RpcErrorInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((err) => {
        if (err instanceof HttpException) return throwError(() => err);
        const rawStatus = err?.statusCode ?? err?.status;
        const statusCode = typeof rawStatus === 'number' ? rawStatus : 500;
        const message = err?.message ?? 'Error interno del servidor';
        return throwError(() => new HttpException(message, statusCode));
      }),
    );
  }
}
