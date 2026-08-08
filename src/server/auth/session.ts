import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { can, type Permission } from "@/lib/permissions";
import { isAuthDevBypass, isClerkConfigured } from "@/lib/utils";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NO_HOSTEL" = "FORBIDDEN",
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
};

const DEV_SESSION: SessionContext = {
  userId: "dev_user_admin",
  hostelId: "dev_hostel",
  role: Role.ADMIN,
  email: "admin@vaikuntham.local",
  fullName: "Dev Admin",
};

export async function getSession(): Promise<SessionContext | null> {
  if (isAuthDevBypass()) {
    return DEV_SESSION;
  }

  if (!isClerkConfigured()) {
    return null;
  }

  const { userId, orgId } = await auth();
  if (!userId) return null;

  const membership = orgId
    ? await prisma.membership.findFirst({
        where: {
          clerkUserId: userId,
          hostel: { clerkOrgId: orgId },
        },
        include: { hostel: true },
      })
    : await prisma.membership.findFirst({
        where: { clerkUserId: userId },
        include: { hostel: true },
        orderBy: { createdAt: "asc" },
      });

  if (!membership) {
    return null;
  }

  const user = await currentUser();

  return {
    userId,
    hostelId: membership.hostelId,
    role: membership.role,
    email: user?.primaryEmailAddress?.emailAddress,
    fullName: user?.fullName,
  };
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
