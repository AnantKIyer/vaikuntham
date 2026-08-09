import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BedStatus, Prisma } from "@vaikuntham/db";
import type {
  BedsListDto,
  BlockTree,
  BulkDeleteBedsInput,
  BulkRenameBedsInput,
  CreateBlockInput,
  CreateFloorInput,
  CreateRoomsBulkInput,
  OccupancyBoardDto,
  RenameBedInput,
  RenameBlockInput,
  RenameFloorInput,
  RenameRoomInput,
  RoomsBoardDto,
  SessionContext,
  SetBedStatusInput,
} from "@vaikuntham/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listBlocks(hostelId: string): Promise<BlockTree[]> {
    const blocks = await this.prisma.block.findMany({
      where: { hostelId },
      orderBy: { name: "asc" },
      include: {
        floors: {
          orderBy: { level: "asc" },
          include: { _count: { select: { rooms: true } } },
        },
      },
    });

    return blocks.map((block) => ({
      id: block.id,
      name: block.name,
      code: block.code,
      floors: block.floors.map((floor) => ({
        id: floor.id,
        name: floor.name,
        level: floor.level,
        roomCount: floor._count.rooms,
      })),
    }));
  }

  async listBeds(
    hostelId: string,
    filters: { status?: BedStatus | "ALL"; floorId?: string | null },
  ): Promise<BedsListDto> {
    const statusFilter = filters.status ?? "ALL";
    const floorFilter = filters.floorId?.trim() || null;

    const bedsRaw = await this.prisma.bed.findMany({
      where: {
        room: {
          floor: {
            block: { hostelId },
            ...(floorFilter ? { id: floorFilter } : {}),
          },
        },
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      },
      orderBy: [
        { room: { floor: { block: { name: "asc" } } } },
        { room: { floor: { level: "asc" } } },
        { room: { number: "asc" } },
        { label: "asc" },
      ],
      include: {
        room: {
          include: {
            floor: { include: { block: true } },
          },
        },
      },
    });

    const totalBeds =
      statusFilter === "ALL" && !floorFilter
        ? bedsRaw.length
        : await this.prisma.bed.count({
            where: {
              room: { floor: { block: { hostelId } } },
            },
          });

    return {
      totalBeds,
      beds: bedsRaw.map((b) => ({
        id: b.id,
        label: b.label,
        status: b.status,
        roomNumber: b.room.number,
        floorName: b.room.floor.name,
        blockName: b.room.floor.block.name,
      })),
    };
  }

  async getRoomsBoard(
    hostelId: string,
    filters: { status?: BedStatus | "ALL"; floorId?: string | null },
  ): Promise<RoomsBoardDto> {
    const [blocks, bedsList] = await Promise.all([
      this.listBlocks(hostelId),
      this.listBeds(hostelId, filters),
    ]);
    return {
      blocks,
      beds: bedsList.beds,
      totalBeds: bedsList.totalBeds,
    };
  }

  async getOccupancyBoard(hostelId: string): Promise<OccupancyBoardDto> {
    const blocks = await this.prisma.block.findMany({
      where: { hostelId },
      orderBy: { name: "asc" },
      include: {
        floors: {
          orderBy: { level: "asc" },
          include: {
            rooms: {
              orderBy: { number: "asc" },
              include: {
                beds: {
                  orderBy: { label: "asc" },
                  include: {
                    allotments: {
                      where: { status: "ACTIVE" },
                      take: 1,
                      include: { resident: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    let totalBeds = 0;
    let occupiedBeds = 0;

    const boardBlocks = blocks.map((block) => {
      let blockTotal = 0;
      let blockOccupied = 0;

      const floors = block.floors.map((floor) => {
        const beds = floor.rooms.flatMap((room) =>
          room.beds.map((bed) => {
            const active = bed.allotments[0];
            const isOccupied = bed.status === BedStatus.OCCUPIED;
            return {
              id: bed.id,
              label: bed.label,
              status: bed.status,
              roomNumber: room.number,
              floorId: floor.id,
              floorName: floor.name,
              blockId: block.id,
              blockName: block.name,
              resident: active
                ? {
                    id: active.resident.id,
                    fullName: active.resident.fullName,
                  }
                : null,
              _occupied: isOccupied,
            };
          }),
        );

        const floorTotal = beds.length;
        const floorOccupied = beds.filter((b) => b._occupied).length;
        blockTotal += floorTotal;
        blockOccupied += floorOccupied;

        return {
          id: floor.id,
          name: floor.name,
          level: floor.level,
          totalBeds: floorTotal,
          occupiedBeds: floorOccupied,
          vacantBeds: beds.filter((b) => b.status === BedStatus.VACANT).length,
          occupancyPercent:
            floorTotal === 0
              ? 0
              : Math.round((floorOccupied / floorTotal) * 100),
          beds: beds.map(({ _occupied: _, ...rest }) => rest),
        };
      });

      totalBeds += blockTotal;
      occupiedBeds += blockOccupied;
      const blockVacant = floors.reduce((n, f) => n + f.vacantBeds, 0);

      return {
        id: block.id,
        name: block.name,
        code: block.code,
        totalBeds: blockTotal,
        occupiedBeds: blockOccupied,
        vacantBeds: blockVacant,
        occupancyPercent:
          blockTotal === 0
            ? 0
            : Math.round((blockOccupied / blockTotal) * 100),
        floors,
      };
    });

    const vacantBeds = boardBlocks.reduce((n, b) => n + b.vacantBeds, 0);

    return {
      totalBeds,
      occupiedBeds,
      vacantBeds,
      occupancyPercent:
        totalBeds === 0 ? 0 : Math.round((occupiedBeds / totalBeds) * 100),
      blocks: boardBlocks,
    };
  }

  async createBlock(session: SessionContext, input: CreateBlockInput) {
    try {
      const block = await this.prisma.$transaction(async (tx) => {
        return tx.block.create({
          data: {
            hostelId: session.hostelId,
            name: input.name,
            code: input.code,
            floors: {
              create: {
                name: input.floorName,
                level: input.floorLevel,
              },
            },
          },
          include: { floors: true },
        });
      });

      await this.audit.write({
        actorId: session.userId,
        hostelId: session.hostelId,
        action: "structure.block.create",
        entityType: "Block",
        entityId: block.id,
        metadata: {
          name: block.name,
          floorId: block.floors[0]?.id,
        },
      });

      return block;
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async createFloor(session: SessionContext, input: CreateFloorInput) {
    const block = await this.prisma.block.findFirst({
      where: { id: input.blockId, hostelId: session.hostelId },
    });
    if (!block) {
      throw new NotFoundException({
        ok: false,
        error: "Block not found",
      });
    }

    try {
      const floor = await this.prisma.floor.create({
        data: {
          blockId: input.blockId,
          name: input.name,
          level: input.level,
        },
      });

      await this.audit.write({
        actorId: session.userId,
        hostelId: session.hostelId,
        action: "structure.floor.create",
        entityType: "Floor",
        entityId: floor.id,
        metadata: {
          blockId: input.blockId,
          name: input.name,
          level: input.level,
        },
      });

      return floor;
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async createRoomsBulk(session: SessionContext, input: CreateRoomsBulkInput) {
    const floor = await this.prisma.floor.findFirst({
      where: {
        id: input.floorId,
        block: { hostelId: session.hostelId },
      },
    });
    if (!floor) {
      throw new NotFoundException({
        ok: false,
        error: "Floor not found",
      });
    }

    const bedLabels = Array.from({ length: input.bedsPerRoom }, (_, i) =>
      String.fromCharCode(65 + i),
    );

    const roomNumbers = Array.from({ length: input.roomCount }, (_, i) => {
      const n = input.roomStart + i;
      return `${input.prefix}${n}`;
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const number of roomNumbers) {
          await tx.room.create({
            data: {
              floorId: floor.id,
              number,
              capacity: input.bedsPerRoom,
              beds: {
                create: bedLabels.map((label) => ({
                  label,
                  status: BedStatus.VACANT,
                })),
              },
            },
          });
        }
      });

      await this.audit.write({
        actorId: session.userId,
        hostelId: session.hostelId,
        action: "structure.rooms.bulk_create",
        entityType: "Floor",
        entityId: floor.id,
        metadata: {
          roomCount: input.roomCount,
          bedsPerRoom: input.bedsPerRoom,
          from: roomNumbers[0],
          to: roomNumbers[roomNumbers.length - 1],
        },
      });

      return { created: input.roomCount };
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async setBedStatus(
    session: SessionContext,
    bedId: string,
    input: SetBedStatusInput,
  ) {
    const bed = await this.prisma.bed.findFirst({
      where: {
        id: bedId,
        room: { floor: { block: { hostelId: session.hostelId } } },
      },
      include: {
        allotments: {
          where: { status: "ACTIVE" },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!bed) {
      throw new NotFoundException({ ok: false, error: "Bed not found" });
    }

    if (bed.status === BedStatus.OCCUPIED || bed.allotments.length > 0) {
      throw new BadRequestException({
        ok: false,
        error: "End the active allotment before changing this bed",
      });
    }

    await this.prisma.bed.update({
      where: { id: bed.id },
      data: { status: input.status },
    });

    await this.audit.write({
      actorId: session.userId,
      hostelId: session.hostelId,
      action: "structure.bed.set_status",
      entityType: "Bed",
      entityId: bed.id,
      metadata: { from: bed.status, to: input.status },
    });

    return { id: bed.id, status: input.status };
  }

  async deleteBed(session: SessionContext, bedId: string) {
    return this.deleteBedsBulk(session, { ids: [bedId] });
  }

  async deleteBedsBulk(session: SessionContext, input: BulkDeleteBedsInput) {
    const uniqueIds = [...new Set(input.ids)];

    await this.prisma.$transaction(async (tx) => {
      for (const bedId of uniqueIds) {
        const bed = await tx.bed.findFirst({
          where: {
            id: bedId,
            room: { floor: { block: { hostelId: session.hostelId } } },
          },
          include: {
            allotments: { select: { id: true, status: true }, take: 1 },
            _count: { select: { allotments: true } },
          },
        });

        if (!bed) {
          throw new NotFoundException({ ok: false, error: "Bed not found" });
        }

        if (bed.status === BedStatus.OCCUPIED) {
          throw new BadRequestException({
            ok: false,
            error: "End the active allotment before deleting this bed",
            code: "BED_OCCUPIED",
          });
        }

        const activeAllotment = await tx.allotment.findFirst({
          where: { bedId: bed.id, status: "ACTIVE" },
        });
        if (activeAllotment) {
          throw new BadRequestException({
            ok: false,
            error: "End the active allotment before deleting this bed",
            code: "BED_OCCUPIED",
          });
        }

        if (bed._count.allotments > 0) {
          throw new ConflictException({
            ok: false,
            error:
              "This bed has allotment history and cannot be deleted. Use BLOCKED status instead.",
            code: "ALLOTMENT_HISTORY",
          });
        }

        await tx.bed.delete({ where: { id: bed.id } });

        await tx.auditLog.create({
          data: {
            actorId: session.userId,
            hostelId: session.hostelId,
            action: "structure.bed.delete",
            entityType: "Bed",
            entityId: bed.id,
            metadata: { label: bed.label, roomId: bed.roomId },
          },
        });
      }
    });

    return { deleted: uniqueIds.length };
  }

  async renameBed(
    session: SessionContext,
    bedId: string,
    input: RenameBedInput,
  ) {
    return this.renameBedsBulk(session, {
      items: [{ id: bedId, label: input.label }],
    }).then(() => ({ id: bedId, label: input.label }));
  }

  async renameBedsBulk(session: SessionContext, input: BulkRenameBedsInput) {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of input.items) {
          const bed = await tx.bed.findFirst({
            where: {
              id: item.id,
              room: { floor: { block: { hostelId: session.hostelId } } },
            },
          });
          if (!bed) {
            throw new NotFoundException({ ok: false, error: "Bed not found" });
          }
          if (bed.label === item.label) continue;

          const updated = await tx.bed.update({
            where: { id: bed.id },
            data: { label: item.label },
          });

          await tx.auditLog.create({
            data: {
              actorId: session.userId,
              hostelId: session.hostelId,
              action: "structure.bed.rename",
              entityType: "Bed",
              entityId: bed.id,
              metadata: { from: bed.label, to: updated.label },
            },
          });
        }
      });
      return { renamed: input.items.length };
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async renameRoom(
    session: SessionContext,
    roomId: string,
    input: RenameRoomInput,
  ) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        floor: { block: { hostelId: session.hostelId } },
      },
    });
    if (!room) {
      throw new NotFoundException({ ok: false, error: "Room not found" });
    }

    try {
      const updated = await this.prisma.room.update({
        where: { id: room.id },
        data: { number: input.number },
      });

      await this.audit.write({
        actorId: session.userId,
        hostelId: session.hostelId,
        action: "structure.room.rename",
        entityType: "Room",
        entityId: room.id,
        metadata: { from: room.number, to: updated.number },
      });

      return { id: updated.id, number: updated.number };
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async renameFloor(
    session: SessionContext,
    floorId: string,
    input: RenameFloorInput,
  ) {
    const floor = await this.prisma.floor.findFirst({
      where: {
        id: floorId,
        block: { hostelId: session.hostelId },
      },
    });
    if (!floor) {
      throw new NotFoundException({ ok: false, error: "Floor not found" });
    }

    try {
      const updated = await this.prisma.floor.update({
        where: { id: floor.id },
        data: { name: input.name },
      });

      await this.audit.write({
        actorId: session.userId,
        hostelId: session.hostelId,
        action: "structure.floor.rename",
        entityType: "Floor",
        entityId: floor.id,
        metadata: { from: floor.name, to: updated.name },
      });

      return { id: updated.id, name: updated.name };
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async renameBlock(
    session: SessionContext,
    blockId: string,
    input: RenameBlockInput,
  ) {
    const block = await this.prisma.block.findFirst({
      where: { id: blockId, hostelId: session.hostelId },
    });
    if (!block) {
      throw new NotFoundException({ ok: false, error: "Block not found" });
    }

    const data: { name?: string; code?: string | null } = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.code !== undefined) data.code = input.code;
    if (Object.keys(data).length === 0) {
      return { id: block.id, name: block.name, code: block.code };
    }

    try {
      const updated = await this.prisma.block.update({
        where: { id: block.id },
        data,
      });

      await this.audit.write({
        actorId: session.userId,
        hostelId: session.hostelId,
        action: "structure.block.rename",
        entityType: "Block",
        entityId: block.id,
        metadata: {
          from: { name: block.name, code: block.code },
          to: { name: updated.name, code: updated.code },
        },
      });

      return { id: updated.id, name: updated.name, code: updated.code };
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  private handlePrismaError(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ConflictException({
        ok: false,
        error: "That name or number already exists",
      });
    }
    throw e;
  }
}
