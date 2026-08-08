import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { SessionContext } from "@vaikuntham/shared";

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionContext => {
    const request = ctx.switchToHttp().getRequest<{ session: SessionContext }>();
    return request.session;
  },
);
