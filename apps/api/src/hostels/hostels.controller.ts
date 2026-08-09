import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  createHostelSchema,
  linkHostelOrgSchema,
  type CreateHostelInput,
  type LinkHostelOrgInput,
} from "@vaikuntham/shared";
import { Bootstrap } from "../auth/bootstrap.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { HostelsService } from "./hostels.service";

@Controller("v1/hostels")
@Bootstrap()
export class HostelsController {
  constructor(private readonly hostels: HostelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createHostelSchema)) body: CreateHostelInput,
    @Headers("authorization") authorization?: string,
  ) {
    const data = await this.hostels.create(
      body,
      bootstrapActorId(authorization),
    );
    return { ok: true, data };
  }

  @Patch(":hostelId/link-org")
  async linkOrg(
    @Param("hostelId") hostelId: string,
    @Body(new ZodValidationPipe(linkHostelOrgSchema)) body: LinkHostelOrgInput,
    @Headers("authorization") authorization?: string,
  ) {
    const data = await this.hostels.linkOrg(
      hostelId,
      body,
      bootstrapActorId(authorization),
    );
    return { ok: true, data };
  }
}

/** Stable actor id for audit when using bootstrap token (no Clerk user). */
function bootstrapActorId(authorization?: string): string {
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const suffix = token ? token.slice(-6) : "unknown";
  return `bootstrap:${suffix}`;
}
