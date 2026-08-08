import { Controller, Get } from "@nestjs/common";
import type {
  AuditLogDto,
  PageWithSession,
  SessionContext,
} from "@vaikuntham/shared";
import { RequirePermissions } from "../auth/roles.decorator";
import { CurrentSession } from "../auth/session.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("v1/audit")
@RequirePermissions("viewAudit")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @CurrentSession() session: SessionContext,
  ): Promise<{ ok: true; data: PageWithSession<{ logs: AuditLogDto[] }> }> {
    const logs = await this.prisma.auditLog.findMany({
      where: { hostelId: session.hostelId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return {
      ok: true,
      data: {
        logs: logs.map((row) => ({
          id: row.id,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          actorId: row.actorId,
          createdAt: row.createdAt.toISOString(),
        })),
        session,
      },
    };
  }
}
