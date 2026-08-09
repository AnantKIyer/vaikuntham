import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  assignAllotmentSchema,
  endAllotmentSchema,
  transferAllotmentSchema,
  vacateResidentSchema,
  type AssignAllotmentInput,
  type EndAllotmentInput,
  type SessionContext,
  type TransferAllotmentInput,
  type VacateResidentInput,
} from "@vaikuntham/shared";
import { RequirePermissions } from "../auth/roles.decorator";
import { CurrentSession } from "../auth/session.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AllotmentService } from "./allotment.service";

@Controller("v1/allotments")
@RequirePermissions("manageAllotment")
export class AllotmentController {
  constructor(private readonly allotment: AllotmentService) {}

  @Get()
  async list(@CurrentSession() session: SessionContext) {
    const data = await this.allotment.listActive(session.hostelId);
    return { ok: true, data };
  }

  @Post()
  async assign(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(assignAllotmentSchema))
    body: AssignAllotmentInput,
  ) {
    const data = await this.allotment.assignAllotment(session, body);
    return { ok: true, data };
  }

  @Post("transfer")
  async transfer(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(transferAllotmentSchema))
    body: TransferAllotmentInput,
  ) {
    const data = await this.allotment.transferAllotment(session, body);
    return { ok: true, data };
  }

  @Post("vacate")
  async vacate(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(vacateResidentSchema))
    body: VacateResidentInput,
  ) {
    const data = await this.allotment.vacateResident(session, body);
    return { ok: true, data };
  }

  @Post(":id/end")
  async end(
    @CurrentSession() session: SessionContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(endAllotmentSchema)) body: EndAllotmentInput,
  ) {
    const data = await this.allotment.endAllotment(session, id, body.notes);
    return { ok: true, data };
  }
}
