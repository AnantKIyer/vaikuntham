import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@vaikuntham/db";
import type {
  CreateHostelInput,
  HostelDto,
  LinkHostelOrgInput,
} from "@vaikuntham/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HostelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateHostelInput, actorId: string): Promise<HostelDto> {
    const slug = await this.resolveUniqueSlug(
      input.slug?.trim() || slugify(input.name),
    );
    const clerkOrgId = input.clerkOrgId?.trim() || null;

    try {
      const hostel = await this.prisma.hostel.create({
        data: {
          name: input.name.trim(),
          slug,
          address: input.address?.trim() || null,
          clerkOrgId,
        },
      });

      await this.audit.write({
        actorId,
        action: "hostel.create",
        entityType: "Hostel",
        entityId: hostel.id,
        hostelId: hostel.id,
        metadata: {
          slug: hostel.slug,
          linkedOrg: Boolean(clerkOrgId),
        },
      });

      return toHostelDto(hostel);
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async linkOrg(
    hostelId: string,
    input: LinkHostelOrgInput,
    actorId: string,
  ): Promise<HostelDto> {
    const hostel = await this.prisma.hostel.findUnique({
      where: { id: hostelId },
    });
    if (!hostel) {
      throw new NotFoundException({ ok: false, error: "Hostel not found" });
    }

    const clerkOrgId = input.clerkOrgId.trim();

    // Idempotent: same org already linked
    if (hostel.clerkOrgId === clerkOrgId) {
      return toHostelDto(hostel);
    }

    if (hostel.clerkOrgId && hostel.clerkOrgId !== clerkOrgId) {
      throw new ConflictException({
        ok: false,
        error: "Hostel is already linked to a different Clerk organization",
        code: "ORG_ALREADY_LINKED",
      });
    }

    try {
      const updated = await this.prisma.hostel.update({
        where: { id: hostelId },
        data: { clerkOrgId },
      });

      await this.audit.write({
        actorId,
        action: "hostel.link_org",
        entityType: "Hostel",
        entityId: updated.id,
        hostelId: updated.id,
        metadata: { clerkOrgId },
      });

      return toHostelDto(updated);
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  private async resolveUniqueSlug(base: string): Promise<string> {
    let candidate = base.slice(0, 64);
    for (let i = 0; i < 8; i += 1) {
      const existing = await this.prisma.hostel.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      const suffix = `-${(i + 2).toString()}`;
      candidate = `${base.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`;
    }
    throw new ConflictException({
      ok: false,
      error: "Could not allocate a unique slug",
    });
  }

  private handlePrismaError(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const target = String(e.meta?.target ?? "");
      if (target.includes("clerkOrgId")) {
        throw new ConflictException({
          ok: false,
          error: "That Clerk organization is already linked to a hostel",
          code: "ORG_TAKEN",
        });
      }
      if (target.includes("slug")) {
        throw new ConflictException({
          ok: false,
          error: "That hostel slug already exists",
          code: "SLUG_TAKEN",
        });
      }
      throw new ConflictException({
        ok: false,
        error: "Hostel conflict",
      });
    }
    throw e;
  }
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "hostel";
}

function toHostelDto(hostel: {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  clerkOrgId: string | null;
  createdAt: Date;
}): HostelDto {
  return {
    id: hostel.id,
    name: hostel.name,
    slug: hostel.slug,
    address: hostel.address,
    clerkOrgId: hostel.clerkOrgId,
    createdAt: hostel.createdAt.toISOString(),
  };
}
