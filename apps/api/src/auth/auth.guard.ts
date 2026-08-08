import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Permission } from "@vaikuntham/shared";
import { ALLOW_MEMBER_KEY } from "./allow-member.decorator";
import { AuthError } from "./auth.utils";
import { AuthService } from "./auth.service";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { PERMISSIONS_KEY } from "./roles.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      session?: Awaited<ReturnType<AuthService["resolveSession"]>>;
    }>();

    try {
      const session = await this.auth.resolveSession(
        request.headers.authorization,
      );
      request.session = session;

      const permissions = this.reflector.getAllAndOverride<Permission[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (permissions?.length) {
        for (const permission of permissions) {
          this.auth.requirePermission(session, permission);
        }
        return true;
      }

      const allowMember = this.reflector.getAllAndOverride<boolean>(
        ALLOW_MEMBER_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (allowMember) {
        return true;
      }

      throw new AuthError("Route not authorized", "FORBIDDEN");
    } catch (e) {
      if (e instanceof AuthError) {
        if (e.code === "UNAUTHENTICATED") {
          throw new UnauthorizedException({ error: e.message, code: e.code });
        }
        throw new ForbiddenException({ error: e.message, code: e.code });
      }
      throw e;
    }
  }
}
