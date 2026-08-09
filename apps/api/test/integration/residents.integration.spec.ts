import { Test } from "@nestjs/testing";
import { Role } from "@vaikuntham/db";
import type { SessionContext } from "@vaikuntham/shared";
import { AuditModule } from "../../src/audit/audit.module";
import { PrismaModule } from "../../src/prisma/prisma.module";
import { ResidentsService } from "../../src/residents/residents.service";
import { prisma, resetDatabase } from "./helpers";

function adminSession(hostelId: string): SessionContext {
  return {
    userId: "user_admin",
    hostelId,
    role: Role.ADMIN,
    email: "admin@test.com",
  };
}

describe("residents CRUD (integration)", () => {
  let residents: ResidentsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule],
      providers: [ResidentsService],
    }).compile();
    residents = moduleRef.get(ResidentsService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates and searches residents by name/phone", async () => {
    const hostel = await prisma.hostel.create({
      data: { name: "R Hostel", slug: "r-hostel" },
    });
    const session = adminSession(hostel.id);

    await residents.create(session, {
      fullName: "Asha Patel",
      phone: "9876543210",
      status: "APPLICANT",
    });
    await residents.create(session, {
      fullName: "Bala Krish",
      phone: "9000000000",
      status: "APPLICANT",
    });

    const byName = await residents.list(hostel.id, { q: "asha" });
    expect(byName.total).toBe(1);
    expect(byName.residents[0]?.fullName).toBe("Asha Patel");

    const byPhone = await residents.list(hostel.id, { q: "900000" });
    expect(byPhone.total).toBe(1);
    expect(byPhone.residents[0]?.fullName).toBe("Bala Krish");
  });

  it("updates status to VACATED", async () => {
    const hostel = await prisma.hostel.create({
      data: { name: "R2", slug: "r2-hostel" },
    });
    const session = adminSession(hostel.id);
    const created = await residents.create(session, {
      fullName: "Vacate Me",
      status: "APPLICANT",
    });

    const updated = await residents.update(session, created.id, {
      status: "VACATED",
    });
    expect(updated.status).toBe("VACATED");
  });
});
