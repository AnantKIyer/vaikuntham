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
});
