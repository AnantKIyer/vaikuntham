import { Controller, Get } from "@nestjs/common";
import { AllowMember } from "../auth/allow-member.decorator";
import { CurrentSession } from "../auth/session.decorator";
import type { SessionContext } from "@vaikuntham/shared";

@Controller("v1/session")
@AllowMember()
export class SessionController {
  @Get()
  getSession(@CurrentSession() session: SessionContext) {
    return { ok: true, data: session };
  }
}
