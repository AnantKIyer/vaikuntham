import { Body, Controller, Get, Post } from "@nestjs/common";
import { Role } from "@vaikuntham/db";
import {
  createMembershipInviteSchema,
  type SessionContext,
} from "@vaikuntham/shared";
import { AuthService } from "../auth/auth.service";
import { RequirePermissions } from "../auth/roles.decorator";
import { CurrentSession } from "../auth/session.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("v1/memberships")
@RequirePermissions("manageHostel")
export class MembershipsController {
  constructor(private readonly auth: AuthService) {}

  @Get("invites")
  async listInvites(@CurrentSession() session: SessionContext) {
    const data = await this.auth.listInvites(session.hostelId);
    return { ok: true, data };
  }

  @Post("invites")
  async createInvite(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(createMembershipInviteSchema)) body: unknown,
  ) {
    const parsed = body as { email: string; role: Role };
    const data = await this.auth.createInvite({
      session,
      email: parsed.email,
      role: parsed.role,
    });
    return { ok: true, data };
  }
}
