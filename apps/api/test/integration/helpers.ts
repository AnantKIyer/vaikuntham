import { PrismaClient, Role } from "@vaikuntham/db";

export const prisma = new PrismaClient();

export async function resetDatabase() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.allotment.deleteMany(),
    prisma.bed.deleteMany(),
    prisma.room.deleteMany(),
    prisma.floor.deleteMany(),
    prisma.block.deleteMany(),
    prisma.resident.deleteMany(),
    prisma.membershipInvite.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.hostel.deleteMany(),
  ]);
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
