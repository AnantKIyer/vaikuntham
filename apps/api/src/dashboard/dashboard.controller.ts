import { Controller, Get } from "@nestjs/common";
import { Prisma } from "@vaikuntham/db";
import type { PageWithSession, SessionContext } from "@vaikuntham/shared";
import { AllowMember } from "../auth/allow-member.decorator";
import { CurrentSession } from "../auth/session.decorator";
import { PrismaService } from "../prisma/prisma.service";

type DashboardCountsRow = {
  bed_count: bigint;
  occupied_count: bigint;
  audit_count: bigint;
  member_count: bigint;
};

@Controller("v1/dashboard")
@AllowMember()
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("stats")
  async stats(@CurrentSession() session: SessionContext) {
    const hostelId = session.hostelId;

    // One round-trip to Postgres instead of four parallel counts (helps remote Supabase).
    const [row] = await this.prisma.$queryRaw<DashboardCountsRow[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::bigint FROM "Bed" b
         INNER JOIN "Room" r ON b."roomId" = r.id
         INNER JOIN "Floor" f ON r."floorId" = f.id
         INNER JOIN "Block" bl ON f."blockId" = bl.id
         WHERE bl."hostelId" = ${hostelId}) AS bed_count,
        (SELECT COUNT(*)::bigint FROM "Bed" b
         INNER JOIN "Room" r ON b."roomId" = r.id
         INNER JOIN "Floor" f ON r."floorId" = f.id
         INNER JOIN "Block" bl ON f."blockId" = bl.id
         WHERE bl."hostelId" = ${hostelId} AND b.status = 'OCCUPIED'::"BedStatus") AS occupied_count,
        (SELECT COUNT(*)::bigint FROM "AuditLog" WHERE "hostelId" = ${hostelId}) AS audit_count,
        (SELECT COUNT(*)::bigint FROM "Membership" WHERE "hostelId" = ${hostelId}) AS member_count
    `);

    const bedCount = Number(row?.bed_count ?? 0);
    const occupiedCount = Number(row?.occupied_count ?? 0);
    const auditCount = Number(row?.audit_count ?? 0);
    const memberCount = Number(row?.member_count ?? 0);

    return {
      ok: true,
      data: {
        bedCount,
        occupiedCount,
        auditCount,
        memberCount,
        session,
      } satisfies PageWithSession<{
        bedCount: number;
        occupiedCount: number;
        auditCount: number;
        memberCount: number;
      }>,
    };
  }
}
