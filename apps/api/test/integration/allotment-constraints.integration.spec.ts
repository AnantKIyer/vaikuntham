import { prisma, resetDatabase, seedAllotmentFixture } from "./helpers";

describe("allotment constraints (integration)", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("has partial unique indexes for active bed and resident", async () => {
    const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'Allotment'
        AND indexname IN ('Allotment_active_bed_key', 'Allotment_active_resident_key')
    `;
    expect(rows.map((r) => r.indexname).sort()).toEqual([
      "Allotment_active_bed_key",
      "Allotment_active_resident_key",
    ]);
  });

  it("rejects a second ACTIVE allotment on the same bed", async () => {
    const hostel = await prisma.hostel.create({
      data: { name: "Test", slug: "test-hostel" },
    });
    const { beds, residents } = await seedAllotmentFixture(hostel.id);
    const bed = beds[0]!;

    await prisma.allotment.create({
      data: {
        hostelId: hostel.id,
        bedId: bed.id,
        residentId: residents[0]!.id,
        status: "ACTIVE",
      },
    });

    await expect(
      prisma.allotment.create({
        data: {
          hostelId: hostel.id,
          bedId: bed.id,
          residentId: residents[1]!.id,
          status: "ACTIVE",
        },
      }),
    ).rejects.toThrow();
  });

  // Race-condition coverage lands with the allotment API ($transaction + retry).
  it.todo("rejects concurrent ACTIVE allotments on the same bed (allotment API)");
});
