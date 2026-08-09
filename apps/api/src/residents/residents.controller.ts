import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createResidentSchema,
  RESIDENT_STATUS_VALUES,
  updateResidentSchema,
  type CreateResidentInput,
  type SessionContext,
  type UpdateResidentInput,
} from "@vaikuntham/shared";
import { ResidentStatus } from "@vaikuntham/db";
import { AllotmentService } from "../allotment/allotment.service";
import { RequirePermissions } from "../auth/roles.decorator";
import { CurrentSession } from "../auth/session.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ResidentsService } from "./residents.service";

@Controller("v1/residents")
@RequirePermissions("manageResidents")
export class ResidentsController {
  constructor(
    private readonly residents: ResidentsService,
    private readonly allotment: AllotmentService,
  ) {}

  @Get()
  async list(
    @CurrentSession() session: SessionContext,
    @Query("q") q?: string,
    @Query("status") status?: string,
  ) {
    const statusFilter =
      status && (RESIDENT_STATUS_VALUES as readonly string[]).includes(status)
        ? (status as ResidentStatus)
        : "ALL";
    const data = await this.residents.list(session.hostelId, {
      q,
      status: statusFilter,
    });
    return { ok: true, data };
  }

  @Get(":id/history")
  async history(
    @CurrentSession() session: SessionContext,
    @Param("id") id: string,
  ) {
    const data = await this.allotment.listHistory(session.hostelId, id);
    return { ok: true, data };
  }

  @Get(":id")
  async get(
    @CurrentSession() session: SessionContext,
    @Param("id") id: string,
  ) {
    const data = await this.residents.get(session.hostelId, id);
    return { ok: true, data };
  }

  @Post()
  async create(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(createResidentSchema)) body: CreateResidentInput,
  ) {
    const data = await this.residents.create(session, body);
    return { ok: true, data };
  }

  @Patch(":id")
  async update(
    @CurrentSession() session: SessionContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateResidentSchema)) body: UpdateResidentInput,
  ) {
    const data = await this.residents.update(session, id, body);
    return { ok: true, data };
  }
}
