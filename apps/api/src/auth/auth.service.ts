import { Injectable, OnModuleInit } from "@nestjs/common";
import { Role } from "@vaikuntham/db";
import { can, type Permission, type SessionContext } from "@vaikuntham/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  AuthError,
  isAuthDevBypass,
  normalizeEmail,
} from "./auth.utils";

const DEMO_SLUG = "demo-hostel";
const DEV_USER_ID = "dev_user_admin";
const SESSION_CACHE_MS = 60_000;
const INVITE_TTL_DAYS = 14;

@Injectable()
export class AuthService implements OnModuleInit {
  private devSession: SessionContext | null = null;
  private devSessionReady = false;
  private devSessionInflight: Promise<SessionContext> | null = null;
  private readonly sessionCache = new Map<
    string,
    { session: SessionContext; expiresAt: number }
  >();
  private readonly sessionInflight = new Map<
    string,
    Promise<SessionContext>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Warm session + DB pool on startup so first page load is not paying cold-connect cost. */
  async onModuleInit() {
    if (isAuthDevBypass()) {
      await this.getDevSession();
    }
  }

  async getOrCreateDemoHostel() {
    return this.prisma.hostel.upsert({
      where: { slug: DEMO_SLUG },
      update: {},
      create: {
        name: "Vaikuntham Demo Hostel",
        slug: DEMO_SLUG,
        address: "Demo Campus",
      },
    });
  }

  async getDevSession(): Promise<SessionContext> {
    if (this.devSessionReady && this.devSession) {
      return this.devSession;
    }
    if (!this.devSessionInflight) {
      this.devSessionInflight = this.loadDevSession();
    }
    return this.devSessionInflight;
  }

  private async loadDevSession(): Promise<SessionContext> {
    const hostel = await this.getOrCreateDemoHostel();

    await this.prisma.membership.upsert({
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

    this.devSession = {
      userId: DEV_USER_ID,
      hostelId: hostel.id,
      role: Role.ADMIN,
      email: "admin@vaikuntham.local",
      fullName: "Dev Admin",
      hostelName: hostel.name,
    };
    this.devSessionReady = true;
    return this.devSession;
  }

  private toSession(input: {
    userId: string;
    hostelId: string;
    role: Role;
    email?: string | null;
    fullName?: string | null;
    hostelName: string;
  }): SessionContext {
    return {
      userId: input.userId,
      hostelId: input.hostelId,
      role: input.role,
      email: input.email,
      fullName: input.fullName,
      hostelName: input.hostelName,
    };
  }

  async resolveSessionFromClerk(input: {
    userId: string;
    orgId?: string | null;
    email?: string | null;
    fullName?: string | null;
  }): Promise<SessionContext> {
    if (input.orgId) {
      return this.resolveOrgBoundSession({
        userId: input.userId,
        orgId: input.orgId,
        email: input.email,
        fullName: input.fullName,
      });
    }

    const existing = await this.prisma.membership.findFirst({
      where: { clerkUserId: input.userId },
      include: { hostel: true },
      orderBy: { createdAt: "asc" },
    });

    if (existing) {
      return this.toSession({
        userId: input.userId,
        hostelId: existing.hostelId,
        role: existing.role,
        email: input.email,
        fullName: input.fullName,
        hostelName: existing.hostel.name,
      });
    }

    throw new AuthError(
      "No hostel membership. Sign in with your Clerk organization or accept an invite.",
      "NOT_PROVISIONED",
    );
  }

  private async resolveOrgBoundSession(input: {
    userId: string;
    orgId: string;
    email?: string | null;
    fullName?: string | null;
  }): Promise<SessionContext> {
    const hostel = await this.prisma.hostel.findUnique({
      where: { clerkOrgId: input.orgId },
    });

    if (!hostel) {
      throw new AuthError(
        "This Clerk organization is not linked to a hostel.",
        "NOT_PROVISIONED",
      );
    }

    const existing = await this.prisma.membership.findUnique({
      where: {
        hostelId_clerkUserId: {
          hostelId: hostel.id,
          clerkUserId: input.userId,
        },
      },
    });

    if (existing) {
      return this.toSession({
        userId: input.userId,
        hostelId: hostel.id,
        role: existing.role,
        email: input.email,
        fullName: input.fullName,
        hostelName: hostel.name,
      });
    }

    return this.provisionOrgMember({
      userId: input.userId,
      email: input.email,
      fullName: input.fullName,
      hostel,
    });
  }

  private async provisionOrgMember(input: {
    userId: string;
    email?: string | null;
    fullName?: string | null;
    hostel: { id: string; name: string };
  }): Promise<SessionContext> {
    const memberCount = await this.prisma.membership.count({
      where: { hostelId: input.hostel.id },
    });

    if (memberCount === 0) {
      return this.createMembership({
        clerkUserId: input.userId,
        hostelId: input.hostel.id,
        role: Role.ADMIN,
        email: input.email,
        fullName: input.fullName,
        hostelName: input.hostel.name,
        auditAction: "membership.bootstrap",
      });
    }

    if (input.email) {
      const invite = await this.prisma.membershipInvite.findFirst({
        where: {
          hostelId: input.hostel.id,
          email: normalizeEmail(input.email),
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (invite) {
        await this.prisma.membershipInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });

        return this.createMembership({
          clerkUserId: input.userId,
          hostelId: input.hostel.id,
          role: invite.role,
          email: input.email,
          fullName: input.fullName,
          hostelName: input.hostel.name,
          auditAction: "membership.invite_accept",
          auditMetadata: { inviteId: invite.id },
        });
      }
    }

    throw new AuthError(
      "Invite required to join this hostel. Ask an admin to invite your email.",
      "NOT_PROVISIONED",
    );
  }

  private async createMembership(input: {
    clerkUserId: string;
    hostelId: string;
    role: Role;
    email?: string | null;
    fullName?: string | null;
    hostelName: string;
    auditAction: string;
    auditMetadata?: Record<string, unknown>;
  }): Promise<SessionContext> {
    const membership = await this.prisma.membership.create({
      data: {
        hostelId: input.hostelId,
        clerkUserId: input.clerkUserId,
        role: input.role,
      },
    });

    await this.audit.write({
      actorId: input.clerkUserId,
      action: input.auditAction,
      entityType: "Membership",
      entityId: membership.id,
      hostelId: input.hostelId,
      metadata: {
        role: input.role,
        email: input.email ?? null,
        ...input.auditMetadata,
      },
    });

    return this.toSession({
      userId: input.clerkUserId,
      hostelId: input.hostelId,
      role: input.role,
      email: input.email,
      fullName: input.fullName,
      hostelName: input.hostelName,
    });
  }

  async createInvite(input: {
    session: SessionContext;
    email: string;
    role: Role;
  }) {
    const email = normalizeEmail(input.email);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

    const invite = await this.prisma.membershipInvite.upsert({
      where: {
        hostelId_email: {
          hostelId: input.session.hostelId,
          email,
        },
      },
      update: {
        role: input.role,
        invitedById: input.session.userId,
        expiresAt,
        acceptedAt: null,
      },
      create: {
        hostelId: input.session.hostelId,
        email,
        role: input.role,
        invitedById: input.session.userId,
        expiresAt,
      },
    });

    await this.audit.write({
      actorId: input.session.userId,
      action: "membership.invite_create",
      entityType: "MembershipInvite",
      entityId: invite.id,
      hostelId: input.session.hostelId,
      metadata: { email, role: input.role, expiresAt: expiresAt.toISOString() },
    });

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    };
  }

  async listInvites(hostelId: string) {
    const invites = await this.prisma.membershipInvite.findMany({
      where: { hostelId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    return invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    }));
  }

  async resolveSession(authHeader?: string): Promise<SessionContext> {
    if (isAuthDevBypass()) {
      return this.getDevSession();
    }

    if (!authHeader?.startsWith("Bearer ")) {
      throw new AuthError("Sign in required", "UNAUTHENTICATED");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new AuthError("Sign in required", "UNAUTHENTICATED");
    }

    const cached = this.sessionCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.session;
    }

    let inflight = this.sessionInflight.get(token);
    if (!inflight) {
      inflight = this.resolveSessionForToken(token).finally(() => {
        this.sessionInflight.delete(token);
      });
      this.sessionInflight.set(token, inflight);
    }
    return inflight;
  }

  private async resolveSessionForToken(token: string): Promise<SessionContext> {
    const { verifyToken } = await import("@clerk/backend");
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const userId = payload.sub;
    if (!userId) {
      throw new AuthError("Invalid token", "UNAUTHENTICATED");
    }

    const orgId =
      typeof payload.org_id === "string" ? payload.org_id : undefined;
    const email =
      typeof payload.email === "string" ? payload.email : undefined;
    const fullName =
      typeof payload.name === "string" ? payload.name : undefined;

    const session = await this.resolveSessionFromClerk({
      userId,
      orgId,
      email,
      fullName,
    });

    this.sessionCache.set(token, {
      session,
      expiresAt: Date.now() + SESSION_CACHE_MS,
    });

    return session;
  }

  requirePermission(session: SessionContext, permission: Permission) {
    if (!can(session.role, permission)) {
      throw new AuthError(`Missing permission: ${permission}`, "FORBIDDEN");
    }
  }
}
