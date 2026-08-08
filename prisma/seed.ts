import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed stub — expand in CB-135 with full demo dataset.
 * Requires DATABASE_URL pointing at Neon (or local Postgres).
 */
async function main() {
  const hostel = await prisma.hostel.upsert({
    where: { slug: "demo-hostel" },
    update: {},
    create: {
      name: "Vaikuntham Demo Hostel",
      slug: "demo-hostel",
      address: "Demo Campus",
    },
  });

  console.log("Seeded hostel:", hostel.id);
  console.log("Roles available:", Object.values(Role).join(", "));
  console.log("Add Membership rows after Clerk users exist.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
