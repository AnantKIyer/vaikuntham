import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { BedStatus, BED_STATUS_VALUES } from "@vaikuntham/shared";
import {
  createBlockSchema,
  createFloorSchema,
  createRoomsBulkSchema,
  setBedStatusSchema,
  type PageWithSession,
  type RoomsBoardDto,
  type SessionContext,
} from "@vaikuntham/shared";
import { RequirePermissions } from "../auth/roles.decorator";
import { CurrentSession } from "../auth/session.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { StructureService } from "./structure.service";

@Controller("v1/structure")
@RequirePermissions("manageStructure")
export class StructureController {
  constructor(private readonly structure: StructureService) {}

  @Get("board")
  async getBoard(
    @CurrentSession() session: SessionContext,
    @Query("status") status?: string,
    @Query("floor") floor?: string,
  ) {
    const statusFilter =
      status && (BED_STATUS_VALUES as readonly string[]).includes(status)
        ? (status as BedStatus)
        : "ALL";

    const data = await this.structure.getRoomsBoard(session.hostelId, {
      status: statusFilter,
      floorId: floor ?? null,
    });
    return {
      ok: true,
      data: { ...data, session } satisfies PageWithSession<RoomsBoardDto>,
    };
  }

  @Get("blocks")
  async listBlocks(@CurrentSession() session: SessionContext) {
    const data = await this.structure.listBlocks(session.hostelId);
    return { ok: true, data };
  }

  @Get("beds")
  async listBeds(
    @CurrentSession() session: SessionContext,
    @Query("status") status?: string,
    @Query("floor") floor?: string,
  ) {
    const statusFilter =
      status && (BED_STATUS_VALUES as readonly string[]).includes(status)
        ? (status as BedStatus)
        : "ALL";

    const data = await this.structure.listBeds(session.hostelId, {
      status: statusFilter,
      floorId: floor ?? null,
    });
    return { ok: true, data };
  }

  @Post("blocks")
  async createBlock(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(createBlockSchema)) body: unknown,
  ) {
    const data = await this.structure.createBlock(
      session,
      body as Parameters<StructureService["createBlock"]>[1],
    );
    return { ok: true, data };
  }

  @Post("floors")
  async createFloor(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(createFloorSchema)) body: unknown,
  ) {
    const data = await this.structure.createFloor(
      session,
      body as Parameters<StructureService["createFloor"]>[1],
    );
    return { ok: true, data };
  }

  @Post("rooms/bulk")
  async createRoomsBulk(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(createRoomsBulkSchema)) body: unknown,
  ) {
    const data = await this.structure.createRoomsBulk(
      session,
      body as Parameters<StructureService["createRoomsBulk"]>[1],
    );
    return { ok: true, data };
  }

  @Patch("beds/:bedId/status")
  async setBedStatus(
    @CurrentSession() session: SessionContext,
    @Param("bedId") bedId: string,
    @Body(new ZodValidationPipe(setBedStatusSchema)) body: unknown,
  ) {
    const data = await this.structure.setBedStatus(
      session,
      bedId,
      body as Parameters<StructureService["setBedStatus"]>[2],
    );
    return { ok: true, data };
  }
}
