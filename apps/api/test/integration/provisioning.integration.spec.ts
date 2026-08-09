import { Test } from "@nestjs/testing";
import { Role } from "@vaikuntham/db";
import { AuthService } from "../../src/auth/auth.service";
import { AuditModule } from "../../src/audit/audit.module";
import { PrismaModule } from "../../src/prisma/prisma.module";
import { AuthError } from "../../src/auth/auth.utils";
import { prisma, resetDatabase } from "./helpers";

describe("membership provisioning (integration)", () => {
  let auth: AuthService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule],
      providers: [AuthService],
    }).compile();
    auth = moduleRef.get(AuthService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("bootstraps first org member as ADMIN", async () => {
    const hostel = await prisma.hostel.create({
      data: {
        name: "Org Hostel",
        slug: "org-hostel",
        clerkOrgId: "org_first",
      },
    });

    const session = await auth.resolveSessionFromClerk({
      userId: "user_first",
      orgId: "org_first",
      email: "first@example.com",
    });

    expect(session.hostelId).toBe(hostel.id);
    expect(session.role).toBe(Role.ADMIN);
  });

  it("rejects second user without invite", async () => {
    await prisma.hostel.create({
      data: {
        name: "Org Hostel",
        slug: "org-hostel",
        clerkOrgId: "org_invite",
        memberships: {
          create: {
            clerkUserId: "user_admin",
            role: Role.ADMIN,
          },
        },
      },
    });

    await expect(
      auth.resolveSessionFromClerk({
        userId: "user_stranger",
        orgId: "org_invite",
        email: "stranger@example.com",
      }),
    ).rejects.toThrow(AuthError);
  });

  it("accepts invited email on sign-in", async () => {
    const hostel = await prisma.hostel.create({
      data: {
        name: "Org Hostel",
        slug: "org-hostel",
        clerkOrgId: "org_invited",
        memberships: {
          create: {
            clerkUserId: "user_admin",
            role: Role.ADMIN,
          },
        },
        invites: {
          create: {
            email: "warden@example.com",
            role: Role.WARDEN,
            invitedById: "user_admin",
            expiresAt: new Date(Date.now() + 86_400_000),
          },
        },
      },
    });

    const session = await auth.resolveSessionFromClerk({
      userId: "user_warden",
      orgId: "org_invited",
      email: "warden@example.com",
    });

    expect(session.hostelId).toBe(hostel.id);
    expect(session.role).toBe(Role.WARDEN);

    const invite = await prisma.membershipInvite.findFirst({
      where: { hostelId: hostel.id, email: "warden@example.com" },
    });
    expect(invite?.acceptedAt).not.toBeNull();
  });

  it("allows only one ADMIN when two users bootstrap concurrently", async () => {
    const hostel = await prisma.hostel.create({
      data: {
        name: "Race Hostel",
        slug: "race-hostel",
        clerkOrgId: "org_race_bootstrap",
      },
    });

    const results = await Promise.allSettled([
      auth.resolveSessionFromClerk({
        userId: "user_race_a",
        orgId: "org_race_bootstrap",
        email: "a@example.com",
      }),
      auth.resolveSessionFromClerk({
        userId: "user_race_b",
        orgId: "org_race_bootstrap",
        email: "b@example.com",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((fulfilled[0] as PromiseFulfilledResult<{ role: Role }>).value.role).toBe(
      Role.ADMIN,
    );
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(AuthError);
    expect((rejected[0] as PromiseRejectedResult).reason.code).toBe(
      "NOT_PROVISIONED",
    );

    const admins = await prisma.membership.findMany({
      where: { hostelId: hostel.id, role: Role.ADMIN },
    });
    expect(admins).toHaveLength(1);
    const members = await prisma.membership.count({
      where: { hostelId: hostel.id },
    });
    expect(members).toBe(1);
  });

  it("allows only one accept when the same invite is claimed concurrently", async () => {
    const hostel = await prisma.hostel.create({
      data: {
        name: "Invite Race Hostel",
        slug: "invite-race-hostel",
        clerkOrgId: "org_race_invite",
        memberships: {
          create: {
            clerkUserId: "user_admin",
            role: Role.ADMIN,
          },
        },
        invites: {
          create: {
            email: "shared@example.com",
            role: Role.WARDEN,
            invitedById: "user_admin",
            expiresAt: new Date(Date.now() + 86_400_000),
          },
        },
      },
    });

    const results = await Promise.allSettled([
      auth.resolveSessionFromClerk({
        userId: "user_claim_a",
        orgId: "org_race_invite",
        email: "shared@example.com",
      }),
      auth.resolveSessionFromClerk({
        userId: "user_claim_b",
        orgId: "org_race_invite",
        email: "shared@example.com",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(
      (fulfilled[0] as PromiseFulfilledResult<{ role: Role }>).value.role,
    ).toBe(Role.WARDEN);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(AuthError);

    const wardens = await prisma.membership.findMany({
      where: { hostelId: hostel.id, role: Role.WARDEN },
    });
    expect(wardens).toHaveLength(1);

    const invite = await prisma.membershipInvite.findFirst({
      where: { hostelId: hostel.id, email: "shared@example.com" },
    });
    expect(invite?.acceptedAt).not.toBeNull();
  });
});
