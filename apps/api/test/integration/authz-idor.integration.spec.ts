import { Test } from "@nestjs/testing";
import { Role } from "@vaikuntham/db";
import { AuthService } from "../../src/auth/auth.service";
import { StructureService } from "../../src/structure/structure.service";
import { AuditModule } from "../../src/audit/audit.module";
import { PrismaModule } from "../../src/prisma/prisma.module";
import { prisma, resetDatabase, seedTwoHostels } from "./helpers";

describe("HTTP authz IDOR (integration)", () => {
  let auth: AuthService;
  let structure: StructureService;

  beforeAll(async () => {
    process.env.ALLOW_TEST_AUTH_HEADERS = "true";

    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule],
      providers: [AuthService, StructureService],
    }).compile();
    auth = moduleRef.get(AuthService);
    structure = moduleRef.get(StructureService);
  });

  afterAll(async () => {
    delete process.env.ALLOW_TEST_AUTH_HEADERS;
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("warden session lacks manageHostel and viewAudit", async () => {
    const { hostelA } = await seedTwoHostels();
    await prisma.membership.create({
      data: {
        hostelId: hostelA.id,
        clerkUserId: "user_warden_a",
        role: Role.WARDEN,
      },
    });

    const session = await auth.resolveTestSession("user_warden_a");

    expect(() => auth.requirePermission(session, "viewAudit")).toThrow();
    expect(() => auth.requirePermission(session, "manageHostel")).toThrow();
    expect(() => auth.requirePermission(session, "manageStructure")).not.toThrow();
  });

  it("cross-hostel bed status patch returns 404", async () => {
    const { hostelA, bedB } = await seedTwoHostels();
    await prisma.membership.create({
      data: {
        hostelId: hostelA.id,
        clerkUserId: "user_admin_a",
        role: Role.ADMIN,
      },
    });

    const session = await auth.resolveTestSession("user_admin_a");

    await expect(
      structure.setBedStatus(session, bedB.id, { status: "BLOCKED" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("admin session can manageHostel", async () => {
    const { hostelA } = await seedTwoHostels();
    await prisma.membership.create({
      data: {
        hostelId: hostelA.id,
        clerkUserId: "user_admin_a",
        role: Role.ADMIN,
      },
    });

    const session = await auth.resolveTestSession("user_admin_a");
    expect(() => auth.requirePermission(session, "manageHostel")).not.toThrow();
  });
});
