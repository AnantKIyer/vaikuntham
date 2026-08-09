import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma, Role } from "@vaikuntham/db";
import { can, type Permission, type SessionContext } from "@vaikuntham/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  allowAuthDevBypass,
  AuthError,
  isAuthDevBypass,
  normalizeEmail,
} from "./auth.utils";

type DbTx = Prisma.TransactionClient;

const DEMO_SLUG = "demo-hostel";
const DEV_USER_ID = "dev_user_admin";
/** Short TTL so role/membership changes converge quickly (CB-160). */
const SESSION_CACHE_MS = 15_000;
const SESSION_CACHE_MAX = 200;
const INVITE_TTL_DAYS = 14;

type SessionCacheEntry = { session: SessionContext; expiresAt: number };

@Injectable()
export class AuthService implements OnModuleInit {
  private devSession: SessionContext | null = null;
  private devSessionReady = false;
  private devSessionInflight: Promise<SessionContext> | null = null;
  private readonly sessionCache = new Map<string, SessionCacheEntry>();
  private readonly sessionInflight = new Map<
    string,
    Promise<SessionContext>
  >();
  private readonly clerkEmailCache = new Map<
    string,
    { email: string | null; expiresAt: number }
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

  /**
   * First org member → ADMIN; otherwise claim a pending invite.
   * Hostel row is locked so concurrent bootstraps / invite accepts cannot race.
   */
  private async provisionOrgMember(input: {
    userId: string;
    email?: string | null;
    fullName?: string | null;
    hostel: { id: string; name: string };
  }): Promise<SessionContext> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT id FROM "Hostel" WHERE id = ${input.hostel.id} FOR UPDATE
        `;

        const already = await tx.membership.findUnique({
          where: {
            hostelId_clerkUserId: {
              hostelId: input.hostel.id,
              clerkUserId: input.userId,
            },
          },
        });
        if (already) {
          return this.toSession({
            userId: input.userId,
            hostelId: input.hostel.id,
            role: already.role,
            email: input.email,
            fullName: input.fullName,
            hostelName: input.hostel.name,
          });
        }

        const memberCount = await tx.membership.count({
          where: { hostelId: input.hostel.id },
        });

        if (memberCount === 0) {
          return this.createMembershipInTx(tx, {
            clerkUserId: input.userId,
            hostelId: input.hostel.id,
            role: Role.ADMIN,
            email: input.email,
            fullName: input.fullName,
            hostelName: input.hostel.name,
            auditAction: "membership.bootstrap",
          });
        }

        if (!input.email) {
          throw new AuthError(
            "Invite required to join this hostel. Ask an admin to invite your email.",
            "NOT_PROVISIONED",
          );
        }

        const email = normalizeEmail(input.email);
        const now = new Date();
        const claimed = await tx.membershipInvite.updateMany({
          where: {
            hostelId: input.hostel.id,
            email,
            acceptedAt: null,
            expiresAt: { gt: now },
          },
          data: { acceptedAt: now },
        });

        if (claimed.count !== 1) {
          throw new AuthError(
            "Invite required to join this hostel. Ask an admin to invite your email.",
            "NOT_PROVISIONED",
          );
        }

        const invite = await tx.membershipInvite.findUniqueOrThrow({
          where: {
            hostelId_email: {
              hostelId: input.hostel.id,
              email,
            },
          },
        });

        return this.createMembershipInTx(tx, {
          clerkUserId: input.userId,
          hostelId: input.hostel.id,
          role: invite.role,
          email: input.email,
          fullName: input.fullName,
          hostelName: input.hostel.name,
          auditAction: "membership.invite_accept",
          auditMetadata: { inviteId: invite.id },
        });
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        const existing = await this.prisma.membership.findUnique({
          where: {
            hostelId_clerkUserId: {
              hostelId: input.hostel.id,
              clerkUserId: input.userId,
            },
          },
        });
        if (existing) {
          return this.toSession({
            userId: input.userId,
            hostelId: input.hostel.id,
            role: existing.role,
            email: input.email,
            fullName: input.fullName,
            hostelName: input.hostel.name,
          });
        }
      }
      throw e;
    }
  }

  private async createMembershipInTx(
    tx: DbTx,
    input: {
      clerkUserId: string;
      hostelId: string;
      role: Role;
      email?: string | null;
      fullName?: string | null;
      hostelName: string;
      auditAction: string;
      auditMetadata?: Record<string, unknown>;
    },
  ): Promise<SessionContext> {
    const membership = await tx.membership.create({
      data: {
        hostelId: input.hostelId,
        clerkUserId: input.clerkUserId,
        role: input.role,
      },
    });

    await tx.auditLog.create({
      data: {
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
      },
    });

    this.invalidateSessionsForUser(input.clerkUserId);

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

  async listMembers(hostelId: string) {
    const members = await this.prisma.membership.findMany({
      where: { hostelId },
      orderBy: { createdAt: "asc" },
    });
    return members.map((m) => ({
      id: m.id,
      clerkUserId: m.clerkUserId,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async revokeInvite(session: SessionContext, inviteId: string) {
    const result = await this.prisma.membershipInvite.deleteMany({
      where: {
        id: inviteId,
        hostelId: session.hostelId,
        acceptedAt: null,
      },
    });
    if (result.count === 0) {
      throw new NotFoundException({ ok: false, error: "Invite not found" });
    }

    await this.audit.write({
      actorId: session.userId,
      action: "membership.invite_revoke",
      entityType: "MembershipInvite",
      entityId: inviteId,
      hostelId: session.hostelId,
    });

    return { revoked: true };
  }

  async updateMembershipRole(
    session: SessionContext,
    membershipId: string,
    role: Role,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, hostelId: session.hostelId },
    });
    if (!membership) {
      throw new NotFoundException({ ok: false, error: "Membership not found" });
    }

    if (membership.role === Role.ADMIN && role !== Role.ADMIN) {
      const adminCount = await this.prisma.membership.count({
        where: { hostelId: session.hostelId, role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new ConflictException({
          ok: false,
          error: "Cannot demote the last admin",
          code: "LAST_ADMIN",
        });
      }
    }

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role },
    });

    await this.audit.write({
      actorId: session.userId,
      action: "membership.role_change",
      entityType: "Membership",
      entityId: membershipId,
      hostelId: session.hostelId,
      metadata: {
        clerkUserId: membership.clerkUserId,
        fromRole: membership.role,
        toRole: role,
      },
    });

    this.invalidateSessionsForUser(membership.clerkUserId);

    return {
      id: updated.id,
      clerkUserId: updated.clerkUserId,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async revokeMembership(session: SessionContext, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, hostelId: session.hostelId },
    });
    if (!membership) {
      throw new NotFoundException({ ok: false, error: "Membership not found" });
    }

    if (membership.clerkUserId === session.userId) {
      throw new ConflictException({
        ok: false,
        error: "Cannot revoke your own membership",
        code: "SELF_REVOKE",
      });
    }

    if (membership.role === Role.ADMIN) {
      const adminCount = await this.prisma.membership.count({
        where: { hostelId: session.hostelId, role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new ConflictException({
          ok: false,
          error: "Cannot revoke the last admin",
          code: "LAST_ADMIN",
        });
      }
    }

    await this.prisma.membership.delete({ where: { id: membershipId } });

    await this.audit.write({
      actorId: session.userId,
      action: "membership.revoke",
      entityType: "Membership",
      entityId: membershipId,
      hostelId: session.hostelId,
      metadata: { clerkUserId: membership.clerkUserId, role: membership.role },
    });

    this.invalidateSessionsForUser(membership.clerkUserId);

    return { revoked: true };
  }

  async resolveSession(
    authHeader?: string,
    testUserId?: string,
    requestMeta?: {
      bypassHeader?: string;
      host?: string;
      remoteAddress?: string;
    },
  ): Promise<SessionContext> {
    if (
      process.env.ALLOW_TEST_AUTH_HEADERS === "true" &&
      testUserId?.trim()
    ) {
      return this.resolveTestSession(testUserId.trim());
    }

    if (
      allowAuthDevBypass({
        bypassHeader: requestMeta?.bypassHeader,
        host: requestMeta?.host,
        remoteAddress: requestMeta?.remoteAddress,
      })
    ) {
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
      // Refresh insertion order for LRU.
      this.sessionCache.delete(token);
      this.sessionCache.set(token, cached);
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

  /** Drop cached sessions for a Clerk user after membership/role changes (CB-160). */
  invalidateSessionsForUser(clerkUserId: string) {
    for (const [token, entry] of this.sessionCache) {
      if (entry.session.userId === clerkUserId) {
        this.sessionCache.delete(token);
      }
    }
  }

  private putSessionCache(token: string, session: SessionContext) {
    if (this.sessionCache.has(token)) {
      this.sessionCache.delete(token);
    }
    this.sessionCache.set(token, {
      session,
      expiresAt: Date.now() + SESSION_CACHE_MS,
    });
    while (this.sessionCache.size > SESSION_CACHE_MAX) {
      const oldest = this.sessionCache.keys().next().value;
      if (oldest === undefined) break;
      this.sessionCache.delete(oldest);
    }
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
    let email =
      typeof payload.email === "string" ? payload.email : undefined;
    const fullName =
      typeof payload.name === "string" ? payload.name : undefined;

    if (!email) {
      email = (await this.resolveClerkPrimaryEmail(userId)) ?? undefined;
    }

    const session = await this.resolveSessionFromClerk({
      userId,
      orgId,
      email,
      fullName,
    });

    this.putSessionCache(token, session);
    return session;
  }

  /** Clerk JWT often omits email — fetch primary address for invite matching (CB-153). */
  async resolveClerkPrimaryEmail(userId: string): Promise<string | null> {
    const cached = this.clerkEmailCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.email;
    }

    const { createClerkClient } = await import("@clerk/backend");
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const user = await clerk.users.getUser(userId);
    const primary =
      user.emailAddresses.find(
        (e) => e.id === user.primaryEmailAddressId,
      ) ?? user.emailAddresses[0];
    const email = primary?.emailAddress?.trim().toLowerCase() ?? null;

    this.clerkEmailCache.set(userId, {
      email,
      expiresAt: Date.now() + SESSION_CACHE_MS,
    });
    return email;
  }

  /** Integration tests only — resolve session by seeded clerkUserId (CB-158). */
  async resolveTestSession(clerkUserId: string): Promise<SessionContext> {
    const membership = await this.prisma.membership.findFirst({
      where: { clerkUserId },
      include: { hostel: true },
      orderBy: { createdAt: "asc" },
    });
    if (!membership) {
      throw new AuthError("Test user not provisioned", "NOT_PROVISIONED");
    }
    return this.toSession({
      userId: clerkUserId,
      hostelId: membership.hostelId,
      role: membership.role,
      hostelName: membership.hostel.name,
    });
  }

  requirePermission(session: SessionContext, permission: Permission) {
    if (!can(session.role, permission)) {
      throw new AuthError(`Missing permission: ${permission}`, "FORBIDDEN");
    }
  }
}
