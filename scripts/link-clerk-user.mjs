#!/usr/bin/env node
/**
 * Grant ADMIN membership on the demo hostel for an existing Clerk user.
 *
 * Usage:
 *   node scripts/link-clerk-user.mjs --username adminuser
 *   node scripts/link-clerk-user.mjs --email you@example.com
 *   node scripts/link-clerk-user.mjs --user-id user_xxx
 */
import { createRequire } from "module";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const requireDb = createRequire(resolve(root, "packages/db/package.json"));
const requireApi = createRequire(resolve(root, "apps/api/package.json"));

const { config } = requireDb("dotenv");
const { PrismaClient, Role } = requireDb("@prisma/client");
const { createClerkClient } = requireApi("@clerk/backend");

config({ path: resolve(root, ".env") });

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function findClerkUser(clerk) {
  const userId = arg("--user-id");
  if (userId) {
    return clerk.users.getUser(userId);
  }

  const username = arg("--username");
  if (username) {
    const list = await clerk.users.getUserList({ username: [username], limit: 1 });
    if (list.data[0]) return list.data[0];
    throw new Error(`No Clerk user with username "${username}"`);
  }

  const email = arg("--email");
  if (email) {
    const list = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    if (list.data[0]) return list.data[0];
    throw new Error(`No Clerk user with email "${email}"`);
  }

  console.error("Provide --username, --email, or --user-id");
  process.exit(1);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  if (!process.env.CLERK_SECRET_KEY?.trim()) {
    console.error("CLERK_SECRET_KEY is required");
    process.exit(1);
  }

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const prisma = new PrismaClient();
  const slug = arg("--slug") ?? "demo-hostel";

  try {
    const user = await findClerkUser(clerk);
    const hostel =
      (await prisma.hostel.findUnique({ where: { slug } })) ??
      (await prisma.hostel.create({
        data: {
          name: "Vaikuntham Demo Hostel",
          slug,
          address: "Local dev",
        },
      }));

    await prisma.membership.upsert({
      where: {
        hostelId_clerkUserId: {
          hostelId: hostel.id,
          clerkUserId: user.id,
        },
      },
      update: { role: Role.ADMIN },
      create: {
        hostelId: hostel.id,
        clerkUserId: user.id,
        role: Role.ADMIN,
      },
    });

    console.log(`
Linked ADMIN membership:
  Clerk user: ${user.username ?? user.id}
  user id:    ${user.id}
  Hostel:     ${hostel.name} (${hostel.id})

Sign out in the browser, then sign in as that user and open /dashboard.
`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
