import { Injectable } from "@nestjs/common";
import type { DashboardActivityDto } from "@vaikuntham/shared";
import { formatPaise } from "@vaikuntham/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async recentActivity(hostelId: string): Promise<DashboardActivityDto> {
    const [allotments, payments] = await Promise.all([
      this.prisma.allotment.findMany({
        where: { hostelId },
        orderBy: { startAt: "desc" },
        take: 8,
        include: {
          resident: { select: { fullName: true } },
          bed: {
            select: {
              label: true,
              room: { select: { number: true } },
            },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: { hostelId },
        orderBy: { receivedAt: "desc" },
        take: 8,
        include: {
          invoice: {
            include: { resident: { select: { fullName: true } } },
          },
        },
      }),
    ]);

    const items = [
      ...allotments.map((a) => ({
        id: a.id,
        kind: "allotment" as const,
        title: a.resident.fullName,
        subtitle: `${a.bed.label} · Room ${a.bed.room.number}`,
        occurredAt: a.startAt.toISOString(),
      })),
      ...payments.map((p) => ({
        id: p.id,
        kind: "payment" as const,
        title: p.invoice.resident.fullName,
        subtitle: `${p.method} · ${formatPaise(p.amountPaise)}`,
        occurredAt: p.receivedAt.toISOString(),
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      )
      .slice(0, 10);

    return { items };
  }
}
