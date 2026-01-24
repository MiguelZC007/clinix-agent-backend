import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export type RequestWithUser = Request & { user?: unknown };

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
