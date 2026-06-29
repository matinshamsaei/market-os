import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { JwtPayload } from '../strategies/jwt.strategy';

export const CurrentUser = createParamDecorator<JwtPayload>(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    return request.user;
  },
);
