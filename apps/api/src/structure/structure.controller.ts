import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { BedStatus, BED_STATUS_VALUES } from "@vaikuntham/shared";
import {
  bulkDeleteBedsSchema,
  bulkRenameBedsSchema,
  createBlockSchema,
  createFloorSchema,
  createRoomsBulkSchema,
  renameBedSchema,
  renameBlockSchema,
  renameFloorSchema,
  renameRoomSchema,
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
export class StructureController {
  constructor(private readonly structure: StructureService) {}

  @Get("board")
  @RequirePermissions("viewStructure")
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

  @Get("occupancy")
  @RequirePermissions("viewStructure")
  async getOccupancy(@CurrentSession() session: SessionContext) {
    const data = await this.structure.getOccupancyBoard(session.hostelId);
    return { ok: true, data };
  }

  @Get("blocks")
  @RequirePermissions("viewStructure")
  async listBlocks(@CurrentSession() session: SessionContext) {
    const data = await this.structure.listBlocks(session.hostelId);
    return { ok: true, data };
  }

  @Get("beds")
  @RequirePermissions("viewStructure")
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
  @RequirePermissions("manageStructure")
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
  @RequirePermissions("manageStructure")
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
  @RequirePermissions("manageStructure")
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

  @Post("beds/delete")
  @RequirePermissions("manageStructure")
  async deleteBedsBulk(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(bulkDeleteBedsSchema)) body: unknown,
  ) {
    const data = await this.structure.deleteBedsBulk(
      session,
      body as Parameters<StructureService["deleteBedsBulk"]>[1],
    );
    return { ok: true, data };
  }

  @Post("beds/rename")
  @RequirePermissions("manageStructure")
  async renameBedsBulk(
    @CurrentSession() session: SessionContext,
    @Body(new ZodValidationPipe(bulkRenameBedsSchema)) body: unknown,
  ) {
    const data = await this.structure.renameBedsBulk(
      session,
      body as Parameters<StructureService["renameBedsBulk"]>[1],
    );
    return { ok: true, data };
  }

  @Patch("beds/:bedId/status")
  @RequirePermissions("manageStructure")
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

  @Delete("beds/:bedId")
  @RequirePermissions("manageStructure")
  async deleteBed(
    @CurrentSession() session: SessionContext,
    @Param("bedId") bedId: string,
  ) {
    const data = await this.structure.deleteBed(session, bedId);
    return { ok: true, data };
  }

  @Patch("beds/:bedId")
  @RequirePermissions("manageStructure")
  async renameBed(
    @CurrentSession() session: SessionContext,
    @Param("bedId") bedId: string,
    @Body(new ZodValidationPipe(renameBedSchema)) body: unknown,
  ) {
    const data = await this.structure.renameBed(
      session,
      bedId,
      body as Parameters<StructureService["renameBed"]>[2],
    );
    return { ok: true, data };
  }

  @Patch("rooms/:roomId")
  @RequirePermissions("manageStructure")
  async renameRoom(
    @CurrentSession() session: SessionContext,
    @Param("roomId") roomId: string,
    @Body(new ZodValidationPipe(renameRoomSchema)) body: unknown,
  ) {
    const data = await this.structure.renameRoom(
      session,
      roomId,
      body as Parameters<StructureService["renameRoom"]>[2],
    );
    return { ok: true, data };
  }

  @Patch("floors/:floorId")
  @RequirePermissions("manageStructure")
  async renameFloor(
    @CurrentSession() session: SessionContext,
    @Param("floorId") floorId: string,
    @Body(new ZodValidationPipe(renameFloorSchema)) body: unknown,
  ) {
    const data = await this.structure.renameFloor(
      session,
      floorId,
      body as Parameters<StructureService["renameFloor"]>[2],
    );
    return { ok: true, data };
  }

  @Patch("blocks/:blockId")
  @RequirePermissions("manageStructure")
  async renameBlock(
    @CurrentSession() session: SessionContext,
    @Param("blockId") blockId: string,
    @Body(new ZodValidationPipe(renameBlockSchema)) body: unknown,
  ) {
    const data = await this.structure.renameBlock(
      session,
      blockId,
      body as Parameters<StructureService["renameBlock"]>[2],
    );
    return { ok: true, data };
  }
}
