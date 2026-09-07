import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  recordPaymentSchema,
  type RecordPaymentInput,
  type SessionContext,
} from "@vaikuntham/shared";
import { RequirePermissions } from "../auth/roles.decorator";
import { CurrentSession } from "../auth/session.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { PaymentsService } from "./payments.service";

@Controller("v1/payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @RequirePermissions("managePayments")
  async record(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(recordPaymentSchema)) body: RecordPaymentInput,
  ) {
    const data = await this.payments.recordPayment(session, body);
    return { ok: true, data };
  }

  @Get("dues")
  @RequirePermissions("viewReports")
  async dues(@CurrentSession() session: SessionContext) {
    const data = await this.payments.listDues(session.hostelId);
    return { ok: true, data };
  }

  @Get(":id")
  @RequirePermissions("managePayments")
  async one(
    @CurrentSession() session: SessionContext,
    @Param("id") id: string,
  ) {
    const data = await this.payments.getPayment(session.hostelId, id);
    return { ok: true, data };
  }
}
