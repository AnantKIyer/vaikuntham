import { existsSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import { PrismaClient, Role } from "@vaikuntham/db";

const rootEnv = resolve(__dirname, "../../../../.env");
if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}

export const prisma = new PrismaClient();

export async function resetDatabase() {
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany();
    await tx.payment.deleteMany();
    await tx.invoiceLine.deleteMany();
    await tx.invoice.deleteMany();
    await tx.feePlanLine.deleteMany();
    await tx.feePlan.deleteMany();
    await tx.allotment.deleteMany();
    await tx.bed.deleteMany();
    await tx.room.deleteMany();
    await tx.floor.deleteMany();
    await tx.block.deleteMany();
    await tx.resident.deleteMany();
    await tx.membershipInvite.deleteMany();
    await tx.membership.deleteMany();
    await tx.hostel.deleteMany();
  });
}

export async function seedTwoHostels() {
  const hostelA = await prisma.hostel.create({
    data: {
      name: "Hostel A",
      slug: "hostel-a",
      clerkOrgId: "org_a",
    },
  });
  const hostelB = await prisma.hostel.create({
    data: {
      name: "Hostel B",
      slug: "hostel-b",
      clerkOrgId: "org_b",
    },
  });

  await prisma.membership.create({
    data: {
      hostelId: hostelA.id,
      clerkUserId: "user_a_admin",
      role: Role.ADMIN,
    },
  });

  const blockB = await prisma.block.create({
    data: {
      hostelId: hostelB.id,
      name: "B Block",
      floors: { create: { name: "Ground", level: 0 } },
    },
  });

  const floorB = await prisma.floor.findFirstOrThrow({
    where: { blockId: blockB.id },
  });

  const roomB = await prisma.room.create({
    data: {
      floorId: floorB.id,
      number: "101",
      capacity: 1,
      beds: { create: { label: "A" } },
    },
  });

  const bedB = await prisma.bed.findFirstOrThrow({ where: { roomId: roomB.id } });

  return { hostelA, hostelB, bedB };
}

export async function seedAllotmentFixture(hostelId: string) {
  const block = await prisma.block.create({
    data: {
      hostelId,
      name: "Main",
      floors: { create: { name: "L1", level: 1 } },
    },
  });
  const floor = await prisma.floor.findFirstOrThrow({ where: { blockId: block.id } });
  const room = await prisma.room.create({
    data: {
      floorId: floor.id,
      number: "201",
      capacity: 2,
      beds: { create: [{ label: "A" }, { label: "B" }] },
    },
  });
  const beds = await prisma.bed.findMany({ where: { roomId: room.id } });
  const residents = await prisma.$transaction([
    prisma.resident.create({
      data: { hostelId, fullName: "Resident One", status: "ACTIVE" },
    }),
    prisma.resident.create({
      data: { hostelId, fullName: "Resident Two", status: "ACTIVE" },
    }),
  ]);
  return { beds, residents };
}
