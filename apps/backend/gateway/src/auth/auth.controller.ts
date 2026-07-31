import {
  AUTH_PATTERNS,
  CurrentUser,
  Public,
  SERVICE_CLIENTS,
  type UserContext,
} from '@aletheia/backend-commons';
import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(SERVICE_CLIENTS.AUTH) private readonly authClient: ClientProxy) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.LOGIN, dto));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.REFRESH, { refreshToken: dto.refreshToken }),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cerrar sesión e invalidar refresh token' })
  logout(@CurrentUser() user: UserContext) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.LOGOUT, { userId: user.userId }));
  }
}
