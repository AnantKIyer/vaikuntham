import { Test } from "@nestjs/testing";
import { Role } from "@vaikuntham/db";
import { AuthService } from "../../src/auth/auth.service";
import { AuditModule } from "../../src/audit/audit.module";
import { PrismaModule } from "../../src/prisma/prisma.module";
import { prisma, resetDatabase } from "./helpers";

const mockGetUser = jest.fn();
const mockVerifyToken = jest.fn();

jest.mock("@clerk/backend", () => ({
  createClerkClient: jest.fn(() => ({
    users: { getUser: mockGetUser },
  })),
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

describe("Clerk email resolution (integration)", () => {
  let auth: AuthService;
  const prevBypass = process.env.AUTH_DEV_BYPASS;
  const prevClerk = process.env.CLERK_SECRET_KEY;

  beforeAll(async () => {
    process.env.AUTH_DEV_BYPASS = "false";
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule],
      providers: [AuthService],
    }).compile();
    auth = moduleRef.get(AuthService);
  });

  afterAll(async () => {
    process.env.AUTH_DEV_BYPASS = prevBypass;
    process.env.CLERK_SECRET_KEY = prevClerk;
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    mockGetUser.mockReset();
  });

  it("resolveClerkPrimaryEmail returns primary email from Clerk API", async () => {
    mockGetUser.mockResolvedValue({
      primaryEmailAddressId: "em_primary",
      emailAddresses: [
        { id: "em_primary", emailAddress: "Warden@Example.com" },
        { id: "em_other", emailAddress: "other@example.com" },
      ],
    });

    const email = await auth.resolveClerkPrimaryEmail("user_clerk_1");
    expect(email).toBe("warden@example.com");
    expect(mockGetUser).toHaveBeenCalledWith("user_clerk_1");

    // Cached — second call does not hit Clerk again
    mockGetUser.mockClear();
    const again = await auth.resolveClerkPrimaryEmail("user_clerk_1");
    expect(again).toBe("warden@example.com");
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("provisions invited user when JWT lacks email but Clerk has it", async () => {
    process.env.CLERK_SECRET_KEY = "sk_test_mock";

    await prisma.hostel.create({
      data: {
        name: "Org Hostel",
        slug: "org-hostel",
        clerkOrgId: "org_email_fallback",
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

    mockVerifyToken.mockResolvedValue({
      sub: "user_warden_new",
      org_id: "org_email_fallback",
    });
    mockGetUser.mockResolvedValue({
      primaryEmailAddressId: "em_primary",
      emailAddresses: [
        { id: "em_primary", emailAddress: "warden@example.com" },
      ],
    });

    const session = await auth.resolveSession("Bearer fake.jwt.token");

    expect(session.role).toBe(Role.WARDEN);
    expect(mockGetUser).toHaveBeenCalledWith("user_warden_new");
  });
});
