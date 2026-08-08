import "server-only";

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type AuditInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  hostelId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function writeAuditLog(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      hostelId: input.hostelId ?? null,
      metadata: input.metadata,
    },
  });
}
