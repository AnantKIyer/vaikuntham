import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ResidentStatus } from "@vaikuntham/db";
import type {
  CreateResidentInput,
  ResidentDto,
  ResidentsListDto,
  SessionContext,
  UpdateResidentInput,
} from "@vaikuntham/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ResidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    hostelId: string,
    filters: { q?: string; status?: ResidentStatus | "ALL" },
  ): Promise<ResidentsListDto> {
    const q = filters.q?.trim();
    const status = filters.status ?? "ALL";

    const where: Prisma.ResidentWhereInput = {
      hostelId,
      ...(status !== "ALL" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { idNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const residents = await this.prisma.resident.findMany({
      where,
      orderBy: [{ fullName: "asc" }],
      include: {
        allotments: {
          where: { status: "ACTIVE" },
          take: 1,
          include: {
            bed: {
              include: {
                room: { include: { floor: { include: { block: true } } } },
              },
            },
          },
        },
      },
    });

    return {
      total: residents.length,
      residents: residents.map((r) => this.toDto(r)),
    };
  }

  async get(hostelId: string, id: string): Promise<ResidentDto> {
    const resident = await this.prisma.resident.findFirst({
      where: { id, hostelId },
      include: {
        allotments: {
          where: { status: "ACTIVE" },
          take: 1,
          include: {
            bed: {
              include: {
                room: { include: { floor: { include: { block: true } } } },
              },
            },
          },
        },
      },
    });
    if (!resident) {
      throw new NotFoundException({ ok: false, error: "Resident not found" });
    }
    return this.toDto(resident);
  }

  async create(session: SessionContext, input: CreateResidentInput) {
    const resident = await this.prisma.resident.create({
      data: {
        hostelId: session.hostelId,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        idType: input.idType,
        idNumber: input.idNumber,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        status: input.status ?? ResidentStatus.APPLICANT,
      },
    });

    await this.audit.write({
      actorId: session.userId,
      hostelId: session.hostelId,
      action: "resident.create",
      entityType: "Resident",
      entityId: resident.id,
      metadata: { fullName: resident.fullName, status: resident.status },
    });

    return this.get(session.hostelId, resident.id);
  }

  async update(
    session: SessionContext,
    id: string,
    input: UpdateResidentInput,
  ) {
    const existing = await this.prisma.resident.findFirst({
      where: { id, hostelId: session.hostelId },
    });
    if (!existing) {
      throw new NotFoundException({ ok: false, error: "Resident not found" });
    }

    const data: Prisma.ResidentUpdateInput = {};
    if (input.fullName !== undefined) data.fullName = input.fullName;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.email !== undefined) data.email = input.email;
    if (input.idType !== undefined) data.idType = input.idType;
    if (input.idNumber !== undefined) data.idNumber = input.idNumber;
    if (input.guardianName !== undefined) data.guardianName = input.guardianName;
    if (input.guardianPhone !== undefined) {
      data.guardianPhone = input.guardianPhone;
    }
    if (input.status !== undefined) data.status = input.status;

    await this.prisma.resident.update({ where: { id }, data });

    await this.audit.write({
      actorId: session.userId,
      hostelId: session.hostelId,
      action: "resident.update",
      entityType: "Resident",
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });

    return this.get(session.hostelId, id);
  }

  private toDto(
    r: {
      id: string;
      fullName: string;
      phone: string | null;
      email: string | null;
      idType: string | null;
      idNumber: string | null;
      guardianName: string | null;
      guardianPhone: string | null;
      status: ResidentStatus;
      createdAt: Date;
      allotments: Array<{
        id: string;
        bed: {
          label: string;
          room: {
            number: string;
            floor: { block: { name: string } };
          };
        };
      }>;
    },
  ): ResidentDto {
    const active = r.allotments[0];
    return {
      id: r.id,
      fullName: r.fullName,
      phone: r.phone,
      email: r.email,
      idType: r.idType,
      idNumber: r.idNumber,
      guardianName: r.guardianName,
      guardianPhone: r.guardianPhone,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      activeAllotment: active
        ? {
            id: active.id,
            bedLabel: active.bed.label,
            roomNumber: active.bed.room.number,
            blockName: active.bed.room.floor.block.name,
          }
        : null,
    };
  }
}
