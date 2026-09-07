import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createFeePlanSchema,
  generateInvoiceSchema,
  type CreateFeePlanInput,
  type GenerateInvoiceInput,
  type SessionContext,
} from "@vaikuntham/shared";
import { RequirePermissions } from "../auth/roles.decorator";
import { CurrentSession } from "../auth/session.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { FeesService } from "./fees.service";

@Controller("v1/fees")
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Get("plans")
  @RequirePermissions("manageFeePlans")
  async listPlans(@CurrentSession() session: SessionContext) {
    const data = await this.fees.listPlans(session.hostelId);
    return { ok: true, data };
  }

  @Post("plans")
  @RequirePermissions("manageFeePlans")
  async createPlan(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(createFeePlanSchema)) body: CreateFeePlanInput,
  ) {
    const data = await this.fees.createPlan(session, body);
    return { ok: true, data };
  }

  @Get("invoices")
  @RequirePermissions("manageFeePlans")
  async listInvoices(
    @CurrentSession() session: SessionContext,
    @Query("residentId") residentId?: string,
    @Query("status") status?: string,
  ) {
    const data = await this.fees.listInvoices(session.hostelId, {
      residentId,
      status,
    });
    return { ok: true, data };
  }

  @Get("invoices/:id")
  @RequirePermissions("manageFeePlans")
  async getInvoice(
    @CurrentSession() session: SessionContext,
    @Param("id") id: string,
  ) {
    const data = await this.fees.getInvoice(session.hostelId, id);
    return { ok: true, data };
  }

  @Post("invoices/generate")
  @RequirePermissions("manageFeePlans")
  async generateInvoice(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(generateInvoiceSchema))
    body: GenerateInvoiceInput,
  ) {
    const data = await this.fees.generateInvoice(session, body);
    return { ok: true, data };
  }

  @Patch("invoices/:id/void")
  @RequirePermissions("manageFeePlans")
  async voidInvoice(
    @CurrentSession() session: SessionContext,
    @Param("id") id: string,
  ) {
    const data = await this.fees.voidInvoice(session, id);
    return { ok: true, data };
  }

  @Get("billing-residents")
  @RequirePermissions("manageFeePlans")
  async billingResidents(@CurrentSession() session: SessionContext) {
    const data = await this.fees.listBillingResidents(session.hostelId);
    return { ok: true, data };
  }

  @Get("summary")
  @RequirePermissions("viewReports")
  async summary(@CurrentSession() session: SessionContext) {
    const data = await this.fees.billingSummary(session.hostelId);
    return { ok: true, data };
  }
}
