import { Controller, Get } from "@nestjs/common";
import type {
  HostelSettingsDto,
  PageWithSession,
  SessionContext,
} from "@vaikuntham/shared";
import { RequirePermissions } from "../auth/roles.decorator";
import { CurrentSession } from "../auth/session.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("v1/settings")
@RequirePermissions("manageHostel")
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getSettings(
    @CurrentSession() session: SessionContext,
  ): Promise<{ ok: true; data: PageWithSession<HostelSettingsDto> }> {
    const [hostel, members] = await Promise.all([
      this.prisma.hostel.findUniqueOrThrow({
        where: { id: session.hostelId },
      }),
      this.prisma.membership.findMany({
        where: { hostelId: session.hostelId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return {
      ok: true,
      data: {
        hostel: {
          id: hostel.id,
          name: hostel.name,
          slug: hostel.slug,
          address: hostel.address,
          clerkOrgId: hostel.clerkOrgId,
        },
        members: members.map((m) => ({
          id: m.id,
          clerkUserId: m.clerkUserId,
          role: m.role,
          createdAt: m.createdAt.toISOString(),
        })),
        session,
      },
    };
  }
}
