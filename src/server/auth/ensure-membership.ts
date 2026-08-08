import "server-only";

import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/server/auth/audit";
import type { SessionContext } from "@/server/auth/session";

const DEMO_SLUG = "demo-hostel";

export async function getOrCreateDemoHostel() {
  return prisma.hostel.upsert({
    where: { slug: DEMO_SLUG },
    update: {},
    create: {
      name: "Vaikuntham Demo Hostel",
      slug: DEMO_SLUG,
      address: "Demo Campus",
    },
  });
}

/**
 * First authenticated visit: attach Clerk user to demo hostel.
 * First member → ADMIN; later members → WARDEN (admin can change later).
 */
export async function ensureMembership(input: {
  clerkUserId: string;
  email?: string | null;
  fullName?: string | null;
  clerkOrgId?: string | null;
}): Promise<SessionContext> {
  const existing = await prisma.membership.findFirst({
    where: { clerkUserId: input.clerkUserId },
    include: { hostel: true },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    if (input.clerkOrgId && !existing.hostel.clerkOrgId) {
      await prisma.hostel.update({
        where: { id: existing.hostelId },
        data: { clerkOrgId: input.clerkOrgId },
      });
    }
    return {
      userId: input.clerkUserId,
      hostelId: existing.hostelId,
      role: existing.role,
      email: input.email,
      fullName: input.fullName,
      hostelName: existing.hostel.name,
    };
  }

  const hostel = await getOrCreateDemoHostel();

  if (input.clerkOrgId && !hostel.clerkOrgId) {
    await prisma.hostel.update({
      where: { id: hostel.id },
      data: { clerkOrgId: input.clerkOrgId },
    });
  }

  const memberCount = await prisma.membership.count({
    where: { hostelId: hostel.id },
  });
  const role = memberCount === 0 ? Role.ADMIN : Role.WARDEN;

  const membership = await prisma.membership.create({
    data: {
      hostelId: hostel.id,
      clerkUserId: input.clerkUserId,
      role,
    },
  });

  await writeAuditLog({
    actorId: input.clerkUserId,
    action: "membership.create",
    entityType: "Membership",
    entityId: membership.id,
    hostelId: hostel.id,
    metadata: { role, email: input.email ?? null },
  });

  return {
    userId: input.clerkUserId,
    hostelId: hostel.id,
    role,
    email: input.email,
    fullName: input.fullName,
    hostelName: hostel.name,
  };
}
