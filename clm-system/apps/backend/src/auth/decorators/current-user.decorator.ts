import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { UserContext } from '../interfaces/user-context.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserContext;
  },
);
