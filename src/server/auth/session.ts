import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { can, type Permission } from "@/lib/permissions";
import { isAuthDevBypass, isClerkConfigured } from "@/lib/utils";
import {
  ensureMembership,
  getOrCreateDemoHostel,
} from "@/server/auth/ensure-membership";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NO_HOSTEL" = "FORBIDDEN",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export type SessionContext = {
  userId: string;
  hostelId: string;
  role: Role;
  email?: string | null;
  fullName?: string | null;
  hostelName?: string | null;
};

const DEV_USER_ID = "dev_user_admin";

async function getDevSession(): Promise<SessionContext> {
  const hostel = await getOrCreateDemoHostel();

  // Keep Settings membership list consistent with the bypass session
  await prisma.membership.upsert({
    where: {
      hostelId_clerkUserId: {
        hostelId: hostel.id,
        clerkUserId: DEV_USER_ID,
      },
    },
    update: { role: Role.ADMIN },
    create: {
      hostelId: hostel.id,
      clerkUserId: DEV_USER_ID,
      role: Role.ADMIN,
    },
  });

  return {
    userId: DEV_USER_ID,
    hostelId: hostel.id,
    role: Role.ADMIN,
    email: "admin@vaikuntham.local",
    fullName: "Dev Admin",
    hostelName: hostel.name,
  };
}

export async function getSession(): Promise<SessionContext | null> {
  if (isAuthDevBypass()) {
    return getDevSession();
  }

  if (!isClerkConfigured()) {
    return null;
  }

  const { userId, orgId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const fullName = user?.fullName;

  if (orgId) {
    const byOrg = await prisma.membership.findFirst({
      where: {
        clerkUserId: userId,
        hostel: { clerkOrgId: orgId },
      },
      include: { hostel: true },
    });
    if (byOrg) {
      return {
        userId,
        hostelId: byOrg.hostelId,
        role: byOrg.role,
        email,
        fullName,
        hostelName: byOrg.hostel.name,
      };
    }
  }

  return ensureMembership({
    clerkUserId: userId,
    email,
    fullName,
    clerkOrgId: orgId,
  });
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Sign in required", "UNAUTHENTICATED");
  }
  return session;
}

export async function requireRole(
  permission: Permission,
): Promise<SessionContext> {
  const session = await requireSession();
  if (!can(session.role, permission)) {
    throw new AuthError(`Missing permission: ${permission}`, "FORBIDDEN");
  }
  return session;
}

export async function requireHostelAccess(
  hostelId: string,
  permission?: Permission,
): Promise<SessionContext> {
  const session = permission
    ? await requireRole(permission)
    : await requireSession();

  if (session.hostelId !== hostelId && !isAuthDevBypass()) {
    throw new AuthError("Wrong hostel context", "FORBIDDEN");
  }

  return session;
}
