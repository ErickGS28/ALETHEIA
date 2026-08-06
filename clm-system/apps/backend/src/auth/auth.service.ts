import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { UserContext } from './interfaces/user-context.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const payload: UserContext = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      privileges: user.privileges,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as JwtSignOptions['expiresIn'],
    });

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id },
    });

    return { accessToken, refreshToken, privileges: user.privileges };
  }

  async refresh(token: string) {
    const record = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!record || record.revokedAt) throw new UnauthorizedException('Refresh token inválido');

    let payload: UserContext;
    try {
      payload = this.jwt.verify<UserContext>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const accessToken = this.jwt.sign({
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles,
      privileges: payload.privileges,
    });

    return { accessToken };
  }

  async logout(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Sesión cerrada' };
  }
}
