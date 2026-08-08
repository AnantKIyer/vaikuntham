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
  CreateBlockInput,
  CreateFloorInput,
  CreateRoomsBulkInput,
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
    if (input.status === BedStatus.OCCUPIED) {
      throw new BadRequestException({
        ok: false,
        error: "Mark occupied via allotment — not bed status alone",
      });
    }

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
