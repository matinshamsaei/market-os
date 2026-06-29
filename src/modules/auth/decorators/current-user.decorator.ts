import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { TokenPayload } from '@/shared/types';

export const CurrentUser = createParamDecorator<TokenPayload>(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: TokenPayload }>();
    return request.user;
  },
);
