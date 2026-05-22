import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Omit<User, 'password'> => {
    const request = ctx.switchToHttp().getRequest();
    const { password, ...user } = request.user;
    return user;
  },
);
