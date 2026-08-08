import { Injectable } from "@nestjs/common";
import type { Prisma } from "@vaikuntham/db";
import { PrismaService } from "../prisma/prisma.service";

type AuditInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  hostelId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  write(input: AuditInput): Promise<{ id: string }> {
    return this.prisma.auditLog.create({
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
}
