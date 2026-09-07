import { Test } from "@nestjs/testing";
import { BedStatus, Role } from "@vaikuntham/db";
import type { SessionContext } from "@vaikuntham/shared";
import { AllotmentModule } from "../../src/allotment/allotment.module";
import { AllotmentService } from "../../src/allotment/allotment.service";
import { assertAllotmentTenancy } from "../../src/allotment/allotment-tenancy";
import { AuditModule } from "../../src/audit/audit.module";
import { PrismaModule } from "../../src/prisma/prisma.module";
import { prisma, resetDatabase, seedAllotmentFixture, seedTwoHostels } from "./helpers";

function adminSession(hostelId: string): SessionContext {
  return {
    userId: "user_admin",
    hostelId,
    role: Role.ADMIN,
    email: "admin@test.com",
  };
}

describe("allotment integrity (integration)", () => {
  let allotment: AllotmentService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule, AllotmentModule],
    }).compile();
    allotment = moduleRef.get(AllotmentService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("assertAllotmentTenancy rejects mismatched hostel ids", () => {
    expect(() =>
      assertAllotmentTenancy({
        hostelId: "hostel_a",
        residentHostelId: "hostel_a",
        bedHostelId: "hostel_b",
      }),
    ).toThrow();
  });

  it("assign sets bed OCCUPIED and end sets VACANT in one transaction each", async () => {
    const hostel = await prisma.hostel.create({
      data: { name: "Test", slug: "test-hostel" },
    });
    const { beds, residents } = await seedAllotmentFixture(hostel.id);
    const session = adminSession(hostel.id);

    const created = await allotment.assignAllotment(session, {
      residentId: residents[0]!.id,
      bedId: beds[0]!.id,
    });

    const bedAfterAssign = await prisma.bed.findUniqueOrThrow({
      where: { id: beds[0]!.id },
    });
    expect(bedAfterAssign.status).toBe(BedStatus.OCCUPIED);
    expect(created.bed.id).toBe(beds[0]!.id);
    expect(created.resident.id).toBe(residents[0]!.id);

    await allotment.endAllotment(session, created.id);

    const bedAfterEnd = await prisma.bed.findUniqueOrThrow({
      where: { id: beds[0]!.id },
    });
    expect(bedAfterEnd.status).toBe(BedStatus.VACANT);
  });

  it("rejects assign when bed belongs to another hostel", async () => {
    const { hostelA, hostelB, bedB } = await seedTwoHostels();
    const { residents } = await seedAllotmentFixture(hostelA.id);
    const session = adminSession(hostelA.id);

    await expect(
      allotment.assignAllotment(session, {
        residentId: residents[0]!.id,
        bedId: bedB.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects assign when resident belongs to another hostel", async () => {
    const { hostelA, hostelB } = await seedTwoHostels();
    const { beds } = await seedAllotmentFixture(hostelA.id);
    const residentB = await prisma.resident.create({
      data: { hostelId: hostelB.id, fullName: "Cross Hostel", status: "APPLICANT" },
    });
    const session = adminSession(hostelA.id);

    await expect(
      allotment.assignAllotment(session, {
        residentId: residentB.id,
        bedId: beds[0]!.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects concurrent ACTIVE allotments on the same bed", async () => {
    const hostel = await prisma.hostel.create({
      data: { name: "Race", slug: "race-hostel" },
    });
    const { beds, residents } = await seedAllotmentFixture(hostel.id);
    const session = adminSession(hostel.id);

    const results = await Promise.allSettled([
      allotment.assignAllotment(session, {
        residentId: residents[0]!.id,
        bedId: beds[0]!.id,
      }),
      allotment.assignAllotment(session, {
        residentId: residents[1]!.id,
        bedId: beds[0]!.id,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const active = await prisma.allotment.count({
      where: { bedId: beds[0]!.id, status: "ACTIVE" },
    });
    expect(active).toBe(1);
  });
});
