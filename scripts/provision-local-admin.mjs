#!/usr/bin/env node
/**
 * Local dev: create Clerk user + DB hostel + ADMIN membership.
 *
 * Usage (from repo root, API not required):
 *   node scripts/provision-local-admin.mjs
 *   node scripts/provision-local-admin.mjs --username adminuser --password 'Vaikuntham@1234'
 *
 * Requires: DATABASE_URL, CLERK_SECRET_KEY in root .env
 * Clerk Dashboard → User & Authentication: enable Username + Password.
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

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

async function findUserByUsername(clerk, username) {
  const list = await clerk.users.getUserList({
    username: [username],
    limit: 1,
  });
  return list.data[0] ?? null;
}

async function main() {
  const username = arg("--username", "adminuser");
  const password = arg("--password", "Vaikuntham@1234");
  const email = arg("--email", "adminuser@example.com");
  const hostelName = arg("--hostel", "Vaikuntham Demo Hostel");
  const slug = arg("--slug", "demo-hostel");

  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required in root .env");
    process.exit(1);
  }
  if (!process.env.CLERK_SECRET_KEY?.trim()) {
    console.error("CLERK_SECRET_KEY is required in root .env");
    process.exit(1);
  }

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const prisma = new PrismaClient();

  try {
    let user = await findUserByUsername(clerk, username);
    if (user) {
      console.log("Clerk user exists:", user.id, username);
    } else {
      user = await clerk.users.createUser({
        username,
        password,
        emailAddress: [email],
        skipPasswordChecks: true,
        skipPasswordRequirement: false,
      });
      console.log("Created Clerk user:", user.id, username);
    }

    let org = null;
    const existingHostel = await prisma.hostel.findUnique({ where: { slug } });

    try {
      if (existingHostel?.clerkOrgId) {
        org = await clerk.organizations.getOrganization({
          organizationId: existingHostel.clerkOrgId,
        });
        console.log("Using linked org:", org.id, org.name);
      } else {
        org = await clerk.organizations.createOrganization({
          name: hostelName,
          createdBy: user.id,
        });
        console.log("Created Clerk org:", org.id, org.name);
      }

      const members = await clerk.organizations.getOrganizationMembershipList({
        organizationId: org.id,
        limit: 100,
      });
      const alreadyInOrg = members.data.some(
        (m) => m.publicUserData?.userId === user.id,
      );
      if (!alreadyInOrg) {
        await clerk.organizations.createOrganizationMembership({
          organizationId: org.id,
          userId: user.id,
          role: "org:admin",
        });
        console.log("Added user to Clerk org");
      }
    } catch (e) {
      const orgDisabled =
        e?.errors?.[0]?.code === "organization_not_enabled_in_instance";
      if (!orgDisabled) throw e;
      console.log(
        "Clerk Organizations disabled — provisioning DB membership only (sign-in without org is OK).",
      );
    }

    const hostel = await prisma.hostel.upsert({
      where: { slug },
      update: {
        name: hostelName,
        ...(org ? { clerkOrgId: org.id } : {}),
      },
      create: {
        name: hostelName,
        slug,
        address: "Local dev",
        ...(org ? { clerkOrgId: org.id } : {}),
      },
    });

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
Done — local super admin provisioned.

  Hostel:  ${hostel.name} (${hostel.id})
  Clerk:   ${username} / (password you set)
  User id: ${user.id}
${org ? `  Org:     ${org.name} (${org.id})\n` : ""}
Sign in at http://localhost:3000/sign-in
  • Use username "${username}" and password Vaikuntham@1234
${org ? `  • If prompted, pick organization "${org.name}"\n` : "  • No Clerk org required (membership linked by user id)\n"}
Then open http://localhost:3000/dashboard
`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
