import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PRIVILEGE_KEY } from '../decorators/require-privilege.decorator';
import type { UserContext } from '../interfaces/user-context.interface';

@Injectable()
export class PrivilegeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(PRIVILEGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const { user } = context.switchToHttp().getRequest<{ user: UserContext }>();
    return user?.privileges?.includes(required) ?? false;
  }
}
