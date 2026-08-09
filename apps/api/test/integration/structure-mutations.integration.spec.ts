import { Test } from "@nestjs/testing";
import { AllotmentStatus, BedStatus, Role } from "@vaikuntham/db";
import { StructureService } from "../../src/structure/structure.service";
import { AuditModule } from "../../src/audit/audit.module";
import { PrismaModule } from "../../src/prisma/prisma.module";
import { prisma, resetDatabase } from "./helpers";

describe("structure delete/rename (integration)", () => {
  let structure: StructureService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule],
      providers: [StructureService],
    }).compile();
    structure = moduleRef.get(StructureService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  async function seedVacantBed() {
    const hostel = await prisma.hostel.create({
      data: { name: "Test Hostel", slug: "test-hostel" },
    });
    const block = await prisma.block.create({
      data: {
        hostelId: hostel.id,
        name: "A Block",
        floors: { create: { name: "L1", level: 1 } },
      },
    });
    const floor = await prisma.floor.findFirstOrThrow({
      where: { blockId: block.id },
    });
    const room = await prisma.room.create({
      data: {
        floorId: floor.id,
        number: "101",
        capacity: 2,
        beds: {
          create: [
            { label: "A", status: BedStatus.VACANT },
            { label: "B", status: BedStatus.VACANT },
          ],
        },
      },
    });
    const beds = await prisma.bed.findMany({ where: { roomId: room.id } });
    const session = {
      userId: "admin_test",
      hostelId: hostel.id,
      role: Role.ADMIN,
      hostelName: hostel.name,
    };
    return { hostel, block, floor, room, beds, session };
  }

  it("deletes a vacant bed with no history", async () => {
    const { beds, session } = await seedVacantBed();
    const result = await structure.deleteBed(session, beds[0].id);
    expect(result.deleted).toBe(1);
    expect(await prisma.bed.count({ where: { id: beds[0].id } })).toBe(0);
  });

  it("rejects delete when bed is occupied", async () => {
    const { beds, hostel, session } = await seedVacantBed();
    const resident = await prisma.resident.create({
      data: { hostelId: hostel.id, fullName: "R1", status: "ACTIVE" },
    });
    await prisma.bed.update({
      where: { id: beds[0].id },
      data: { status: BedStatus.OCCUPIED },
    });
    await prisma.allotment.create({
      data: {
        hostelId: hostel.id,
        bedId: beds[0].id,
        residentId: resident.id,
        status: AllotmentStatus.ACTIVE,
        startAt: new Date(),
      },
    });

    await expect(structure.deleteBed(session, beds[0].id)).rejects.toMatchObject({
      response: { code: "BED_OCCUPIED" },
    });
  });

  it("rejects delete when bed has ended allotment history", async () => {
    const { beds, hostel, session } = await seedVacantBed();
    const resident = await prisma.resident.create({
      data: { hostelId: hostel.id, fullName: "R1", status: "VACATED" },
    });
    await prisma.allotment.create({
      data: {
        hostelId: hostel.id,
        bedId: beds[0].id,
        residentId: resident.id,
        status: AllotmentStatus.ENDED,
        startAt: new Date(Date.now() - 86_400_000),
        endAt: new Date(),
      },
    });

    await expect(structure.deleteBed(session, beds[0].id)).rejects.toMatchObject({
      response: { code: "ALLOTMENT_HISTORY" },
    });
  });

  it("renames bed label and rejects duplicate in same room", async () => {
    const { beds, session } = await seedVacantBed();

    await structure.renameBed(session, beds[0].id, { label: "C" });

    await expect(
      structure.renameBed(session, beds[1].id, { label: "C" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("bulk delete is atomic — rolls back if one bed invalid", async () => {
    const { beds, session } = await seedVacantBed();
    await prisma.bed.update({
      where: { id: beds[1].id },
      data: { status: BedStatus.OCCUPIED },
    });

    await expect(
      structure.deleteBedsBulk(session, { ids: [beds[0].id, beds[1].id] }),
    ).rejects.toMatchObject({ response: { code: "BED_OCCUPIED" } });

    expect(await prisma.bed.count({ where: { id: beds[0].id } })).toBe(1);
  });

  it("bulk renames beds", async () => {
    const { beds, session } = await seedVacantBed();

    await structure.renameBedsBulk(session, {
      items: [
        { id: beds[0].id, label: "X" },
        { id: beds[1].id, label: "Y" },
      ],
    });

    const updated = await prisma.bed.findMany({
      where: { id: { in: beds.map((b) => b.id) } },
    });
    expect(updated.map((b) => b.label).sort()).toEqual(["X", "Y"]);
  });
});
