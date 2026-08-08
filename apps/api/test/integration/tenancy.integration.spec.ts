import { Test } from "@nestjs/testing";
import { StructureService } from "../../src/structure/structure.service";
import { PrismaModule } from "../../src/prisma/prisma.module";
import { AuditModule } from "../../src/audit/audit.module";
import { prisma, resetDatabase, seedTwoHostels } from "./helpers";

describe("hostel isolation (integration)", () => {
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

  it("listBlocks returns only blocks for the requested hostel", async () => {
    const { hostelA, hostelB } = await seedTwoHostels();

    const blocksA = await structure.listBlocks(hostelA.id);
    const blocksB = await structure.listBlocks(hostelB.id);

    expect(blocksA).toHaveLength(0);
    expect(blocksB).toHaveLength(1);
    expect(blocksB[0]?.name).toBe("B Block");
  });
});
