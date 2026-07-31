import { AUTH_PATTERNS } from '@aletheia/backend-commons';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';

/**
 * Controlador de microservicio: responde a mensajes Redis enviados por el gateway.
 * No expone HTTP — el borde REST vive en el gateway.
 */
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() dto: { email: string; password: string }) {
    return this.authService.login(dto);
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  refresh(@Payload() data: { refreshToken: string }) {
    return this.authService.refresh(data.refreshToken);
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  logout(@Payload() data: { userId: number }) {
    return this.authService.logout(data.userId);
  }
}
