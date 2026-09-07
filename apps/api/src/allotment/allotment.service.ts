import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AllotmentStatus, BedStatus, Prisma, ResidentStatus } from "@vaikuntham/db";
import type {
  AllotmentDto,
  AllotmentsListDto,
  AssignAllotmentInput,
  SessionContext,
  TransferAllotmentInput,
  VacateResidentInput,
  VacateResultDto,
} from "@vaikuntham/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FeesService } from "../fees/fees.service";
import { assertAllotmentTenancy } from "./allotment-tenancy";

const bedHostelInclude = {
  room: { include: { floor: { include: { block: true } } } },
} satisfies Prisma.BedInclude;

/** Remote pooler RTT needs headroom beyond Prisma’s 5s default. */
const TX = { maxWait: 15_000, timeout: 30_000 } as const;

@Injectable()
export class AllotmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fees: FeesService,
  ) {}

  async listActive(hostelId: string): Promise<AllotmentsListDto> {
    const rows = await this.prisma.allotment.findMany({
      where: { hostelId, status: AllotmentStatus.ACTIVE },
      orderBy: { startAt: "desc" },
      include: {
        resident: true,
        bed: { include: bedHostelInclude },
      },
    });

    return {
      allotments: rows.map((row) => this.toDto(row)),
    };
  }

  async assignAllotment(session: SessionContext, input: AssignAllotmentInput) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const resident = await tx.resident.findFirst({
          where: { id: input.residentId, hostelId: session.hostelId },
        });
        if (!resident) {
          throw new NotFoundException({ ok: false, error: "Resident not found" });
        }

        const bed = await tx.bed.findFirst({
          where: {
            id: input.bedId,
            room: { floor: { block: { hostelId: session.hostelId } } },
          },
          include: bedHostelInclude,
        });
        if (!bed) {
          throw new NotFoundException({ ok: false, error: "Bed not found" });
        }

        await tx.$queryRaw`SELECT id FROM "Bed" WHERE id = ${bed.id} FOR UPDATE`;

        const lockedBed = await tx.bed.findUniqueOrThrow({
          where: { id: bed.id },
          include: bedHostelInclude,
        });

        assertAllotmentTenancy({
          hostelId: session.hostelId,
          residentHostelId: resident.hostelId,
          bedHostelId: lockedBed.room.floor.block.hostelId,
        });

        if (lockedBed.status === BedStatus.OCCUPIED) {
          throw new ConflictException({
            ok: false,
            error: "Bed is already occupied",
            code: "BED_OCCUPIED",
          });
        }
        if (lockedBed.status !== BedStatus.VACANT) {
          throw new ConflictException({
            ok: false,
            error: "Bed must be vacant to assign",
            code: "BED_NOT_VACANT",
          });
        }

        const activeResidentAllotment = await tx.allotment.findFirst({
          where: { residentId: resident.id, status: AllotmentStatus.ACTIVE },
        });
        if (activeResidentAllotment) {
          throw new ConflictException({
            ok: false,
            error: "Resident already has an active allotment",
            code: "RESIDENT_ALREADY_ALLOTTED",
          });
        }

        const activeBedAllotment = await tx.allotment.findFirst({
          where: { bedId: lockedBed.id, status: AllotmentStatus.ACTIVE },
        });
        if (activeBedAllotment) {
          throw new ConflictException({
            ok: false,
            error: "Bed already has an active allotment",
            code: "BED_ALREADY_ALLOTTED",
          });
        }

        const allotment = await tx.allotment.create({
          data: {
            hostelId: session.hostelId,
            residentId: resident.id,
            bedId: lockedBed.id,
            status: AllotmentStatus.ACTIVE,
            notes: input.notes,
          },
          include: {
            resident: true,
            bed: { include: bedHostelInclude },
          },
        });

        await tx.bed.update({
          where: { id: lockedBed.id },
          data: { status: BedStatus.OCCUPIED },
        });

        if (resident.status !== ResidentStatus.ACTIVE) {
          await tx.resident.update({
            where: { id: resident.id },
            data: { status: ResidentStatus.ACTIVE },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: session.userId,
            hostelId: session.hostelId,
            action: "allotment.assign",
            entityType: "Allotment",
            entityId: allotment.id,
            metadata: { residentId: resident.id, bedId: lockedBed.id },
          },
        });

        return this.toDto({
          ...allotment,
          bed: { ...allotment.bed, status: BedStatus.OCCUPIED },
        });
      }, TX);
    } catch (e) {
      this.handleUniqueConflict(e);
    }
  }

  async endAllotment(
    session: SessionContext,
    allotmentId: string,
    notes?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      return this.endActiveInTxn(tx, session, allotmentId, notes, "allotment.end");
    }, TX);
  }

  async transferAllotment(
    session: SessionContext,
    input: TransferAllotmentInput,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.allotment.findFirst({
          where: {
            id: input.allotmentId,
            hostelId: session.hostelId,
            status: AllotmentStatus.ACTIVE,
          },
          include: {
            resident: true,
            bed: { include: bedHostelInclude },
          },
        });
        if (!current) {
          throw new NotFoundException({
            ok: false,
            error: "Active allotment not found",
          });
        }

        if (current.bedId === input.toBedId) {
          throw new BadRequestException({
            ok: false,
            error: "Resident is already on that bed",
            code: "SAME_BED",
          });
        }

        const toBed = await tx.bed.findFirst({
          where: {
            id: input.toBedId,
            room: { floor: { block: { hostelId: session.hostelId } } },
          },
          include: bedHostelInclude,
        });
        if (!toBed) {
          throw new NotFoundException({ ok: false, error: "Target bed not found" });
        }

        // Lock both beds in stable id order to avoid deadlocks.
        const lockIds = [current.bedId, toBed.id].sort();
        for (const id of lockIds) {
          await tx.$queryRaw`SELECT id FROM "Bed" WHERE id = ${id} FOR UPDATE`;
        }

        const lockedTo = await tx.bed.findUniqueOrThrow({
          where: { id: toBed.id },
          include: bedHostelInclude,
        });

        assertAllotmentTenancy({
          hostelId: session.hostelId,
          residentHostelId: current.resident.hostelId,
          bedHostelId: lockedTo.room.floor.block.hostelId,
        });

        if (lockedTo.status !== BedStatus.VACANT) {
          throw new ConflictException({
            ok: false,
            error: "Target bed must be vacant",
            code: "BED_NOT_VACANT",
          });
        }

        const targetActive = await tx.allotment.findFirst({
          where: { bedId: lockedTo.id, status: AllotmentStatus.ACTIVE },
        });
        if (targetActive) {
          throw new ConflictException({
            ok: false,
            error: "Target bed already has an active allotment",
            code: "BED_ALREADY_ALLOTTED",
          });
        }

        const endedAt = new Date();
        await tx.allotment.update({
          where: { id: current.id },
          data: {
            status: AllotmentStatus.ENDED,
            endAt: endedAt,
            notes: input.notes ?? current.notes,
          },
        });
        await tx.bed.update({
          where: { id: current.bedId },
          data: { status: BedStatus.VACANT },
        });

        const created = await tx.allotment.create({
          data: {
            hostelId: session.hostelId,
            residentId: current.residentId,
            bedId: lockedTo.id,
            status: AllotmentStatus.ACTIVE,
            notes: input.notes,
            startAt: endedAt,
          },
          include: {
            resident: true,
            bed: { include: bedHostelInclude },
          },
        });

        await tx.bed.update({
          where: { id: lockedTo.id },
          data: { status: BedStatus.OCCUPIED },
        });

        await tx.auditLog.create({
          data: {
            actorId: session.userId,
            hostelId: session.hostelId,
            action: "allotment.transfer",
            entityType: "Allotment",
            entityId: created.id,
            metadata: {
              fromAllotmentId: current.id,
              fromBedId: current.bedId,
              toBedId: lockedTo.id,
              residentId: current.residentId,
            },
          },
        });

        return this.toDto({
          ...created,
          bed: { ...created.bed, status: BedStatus.OCCUPIED },
        });
      }, TX);
    } catch (e) {
      this.handleUniqueConflict(e);
    }
  }

  async vacateResident(
    session: SessionContext,
    input: VacateResidentInput,
  ): Promise<VacateResultDto> {
    const openDuesPaise = await this.openDuesPaise(
      session.hostelId,
      input.residentId,
    );
    if (openDuesPaise > 0 && !input.acknowledgeDues) {
      throw new ConflictException({
        ok: false,
        error: `Resident has open dues of ${openDuesPaise} paise. Confirm to vacate anyway.`,
        code: "OPEN_DUES",
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const resident = await tx.resident.findFirst({
        where: { id: input.residentId, hostelId: session.hostelId },
      });
      if (!resident) {
        throw new NotFoundException({ ok: false, error: "Resident not found" });
      }

      const active = await tx.allotment.findFirst({
        where: {
          residentId: resident.id,
          hostelId: session.hostelId,
          status: AllotmentStatus.ACTIVE,
        },
      });

      let allotmentDto: AllotmentDto | null = null;
      if (active) {
        allotmentDto = await this.endActiveInTxn(
          tx,
          session,
          active.id,
          input.notes,
          "allotment.vacate",
        );
      }

      await tx.resident.update({
        where: { id: resident.id },
        data: { status: ResidentStatus.VACATED },
      });

      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          hostelId: session.hostelId,
          action: "resident.vacate",
          entityType: "Resident",
          entityId: resident.id,
          metadata: {
            allotmentId: active?.id ?? null,
            openDuesPaise,
          },
        },
      });

      return {
        allotment: allotmentDto,
        residentId: resident.id,
        openDuesPaise,
      };
    }, TX);
  }

  async listHistory(
    hostelId: string,
    residentId: string,
  ): Promise<AllotmentsListDto> {
    const resident = await this.prisma.resident.findFirst({
      where: { id: residentId, hostelId },
    });
    if (!resident) {
      throw new NotFoundException({ ok: false, error: "Resident not found" });
    }

    const rows = await this.prisma.allotment.findMany({
      where: { hostelId, residentId },
      orderBy: { startAt: "desc" },
      include: {
        resident: true,
        bed: { include: bedHostelInclude },
      },
    });

    return { allotments: rows.map((row) => this.toDto(row)) };
  }

  private async openDuesPaise(
    hostelId: string,
    residentId: string,
  ): Promise<number> {
    return this.fees.sumOpenDuesPaise(hostelId, residentId);
  }

  private async endActiveInTxn(
    tx: Prisma.TransactionClient,
    session: SessionContext,
    allotmentId: string,
    notes: string | undefined,
    action: string,
  ): Promise<AllotmentDto> {
    const allotment = await tx.allotment.findFirst({
      where: {
        id: allotmentId,
        hostelId: session.hostelId,
        status: AllotmentStatus.ACTIVE,
      },
      include: {
        resident: true,
        bed: { include: bedHostelInclude },
      },
    });
    if (!allotment) {
      throw new NotFoundException({ ok: false, error: "Allotment not found" });
    }

    await tx.$queryRaw`SELECT id FROM "Bed" WHERE id = ${allotment.bedId} FOR UPDATE`;

    assertAllotmentTenancy({
      hostelId: session.hostelId,
      residentHostelId: allotment.resident.hostelId,
      bedHostelId: allotment.bed.room.floor.block.hostelId,
    });

    const endedAt = new Date();
    const updated = await tx.allotment.update({
      where: { id: allotment.id },
      data: {
        status: AllotmentStatus.ENDED,
        endAt: endedAt,
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        resident: true,
        bed: { include: bedHostelInclude },
      },
    });

    await tx.bed.update({
      where: { id: allotment.bedId },
      data: { status: BedStatus.VACANT },
    });

    await tx.auditLog.create({
      data: {
        actorId: session.userId,
        hostelId: session.hostelId,
        action,
        entityType: "Allotment",
        entityId: allotment.id,
        metadata: {
          residentId: allotment.residentId,
          bedId: allotment.bedId,
        },
      },
    });

    return this.toDto({
      ...updated,
      bed: { ...updated.bed, status: BedStatus.VACANT },
    });
  }

  private toDto(row: {
    id: string;
    status: AllotmentStatus;
    startAt: Date;
    endAt: Date | null;
    notes: string | null;
    resident: { id: string; fullName: string; status: string };
    bed: {
      id: string;
      label: string;
      status: string;
      room: {
        number: string;
        floor: { name: string; block: { name: string } };
      };
    };
  }): AllotmentDto {
    return {
      id: row.id,
      status: row.status,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt?.toISOString() ?? null,
      notes: row.notes,
      resident: {
        id: row.resident.id,
        fullName: row.resident.fullName,
        status: row.resident.status,
      },
      bed: {
        id: row.bed.id,
        label: row.bed.label,
        status: row.bed.status,
        roomNumber: row.bed.room.number,
        floorName: row.bed.room.floor.name,
        blockName: row.bed.room.floor.block.name,
      },
    };
  }

  private handleUniqueConflict(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new ConflictException({
        ok: false,
        error: "Bed or resident already has an active allotment",
        code: "ALLOTMENT_CONFLICT",
      });
    }
    throw e;
  }
}
