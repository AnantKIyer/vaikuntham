import { Test } from "@nestjs/testing";
import { BedStatus, Role } from "@vaikuntham/db";
import type { SessionContext } from "@vaikuntham/shared";
import { AllotmentService } from "../../src/allotment/allotment.service";
import { PrismaModule } from "../../src/prisma/prisma.module";
import { prisma, resetDatabase, seedAllotmentFixture } from "./helpers";

function adminSession(hostelId: string): SessionContext {
  return {
    userId: "user_admin",
    hostelId,
    role: Role.ADMIN,
    email: "admin@test.com",
  };
}

describe("allotment transfer/vacate (integration)", () => {
  let allotment: AllotmentService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AllotmentService],
    }).compile();
    allotment = moduleRef.get(AllotmentService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("transfers in one transaction: old ENDED, new ACTIVE, beds synced", async () => {
    const hostel = await prisma.hostel.create({
      data: { name: "T", slug: "transfer-hostel" },
    });
    const { beds, residents } = await seedAllotmentFixture(hostel.id);
    const session = adminSession(hostel.id);

    const first = await allotment.assignAllotment(session, {
      residentId: residents[0]!.id,
      bedId: beds[0]!.id,
    });

    const transferred = await allotment.transferAllotment(session, {
      allotmentId: first.id,
      toBedId: beds[1]!.id,
    });

    expect(transferred.bed.id).toBe(beds[1]!.id);

    const old = await prisma.allotment.findUniqueOrThrow({
      where: { id: first.id },
    });
    expect(old.status).toBe("ENDED");
    expect(old.endAt).not.toBeNull();

    const bedFrom = await prisma.bed.findUniqueOrThrow({
      where: { id: beds[0]!.id },
    });
    const bedTo = await prisma.bed.findUniqueOrThrow({
      where: { id: beds[1]!.id },
    });
    expect(bedFrom.status).toBe(BedStatus.VACANT);
    expect(bedTo.status).toBe(BedStatus.OCCUPIED);

    const history = await allotment.listHistory(hostel.id, residents[0]!.id);
    expect(history.allotments).toHaveLength(2);
  });

  it("vacate ends allotment and sets resident VACATED", async () => {
    const hostel = await prisma.hostel.create({
      data: { name: "V", slug: "vacate-hostel" },
    });
    const { beds, residents } = await seedAllotmentFixture(hostel.id);
    const session = adminSession(hostel.id);

    await allotment.assignAllotment(session, {
      residentId: residents[0]!.id,
      bedId: beds[0]!.id,
    });

    const result = await allotment.vacateResident(session, {
      residentId: residents[0]!.id,
    });

    expect(result.openDuesPaise).toBe(0);
    expect(result.allotment?.status).toBe("ENDED");

    const resident = await prisma.resident.findUniqueOrThrow({
      where: { id: residents[0]!.id },
    });
    expect(resident.status).toBe("VACATED");

    const bed = await prisma.bed.findUniqueOrThrow({
      where: { id: beds[0]!.id },
    });
    expect(bed.status).toBe(BedStatus.VACANT);
  });
});
