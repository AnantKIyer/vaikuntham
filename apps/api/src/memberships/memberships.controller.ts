import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { Role } from "@vaikuntham/db";
import {
  createMembershipInviteSchema,
  updateMembershipRoleSchema,
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

  @Get()
  async listMembers(@CurrentSession() session: SessionContext) {
    const data = await this.auth.listMembers(session.hostelId);
    return { ok: true, data };
  }

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

  @Delete("invites/:id")
  async revokeInvite(
    @CurrentSession() session: SessionContext,
    @Param("id") id: string,
  ) {
    const data = await this.auth.revokeInvite(session, id);
    return { ok: true, data };
  }

  @Patch(":id")
  async updateRole(
    @CurrentSession() session: SessionContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMembershipRoleSchema)) body: unknown,
  ) {
    const parsed = body as { role: Role };
    const data = await this.auth.updateMembershipRole(
      session,
      id,
      parsed.role,
    );
    return { ok: true, data };
  }

  @Delete(":id")
  async revokeMember(
    @CurrentSession() session: SessionContext,
    @Param("id") id: string,
  ) {
    const data = await this.auth.revokeMembership(session, id);
    return { ok: true, data };
  }
}
