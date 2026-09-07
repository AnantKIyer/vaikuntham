#!/usr/bin/env node
/**
 * Seed demo dataset: 3 owners, 16 hostels, staff, residents, allotments.
 *
 * Usage (repo root):
 *   node scripts/seed-demo-data.mjs
 *   node scripts/seed-demo-data.mjs --reset
 *   node scripts/seed-demo-data.mjs --skip-clerk   # DB-only, fake clerk ids
 *
 * Requires: DATABASE_URL, CLERK_SECRET_KEY (unless --skip-clerk)
 */
import { createRequire } from "module";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  OWNERS,
  DEMO_PASSWORD,
  DEMO_SLUG_PREFIXES,
} from "./demo-data/catalog.mjs";
import {
  createRng,
  bedCountForRoom,
  bedLabels,
  residentGender,
  makeResidentProfile,
  shuffle,
  STAFF_NAMES,
  staffUsernames,
  splitName,
} from "./demo-data/generators.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const requireDb = createRequire(resolve(root, "packages/db/package.json"));
const requireApi = createRequire(resolve(root, "apps/api/package.json"));

const { config } = requireDb("dotenv");
const {
  PrismaClient,
  Role,
  BedStatus,
  AllotmentStatus,
  ResidentStatus,
  FeeLineKind,
  InvoiceStatus,
  PaymentMethod,
} = requireDb("@prisma/client");
const { createClerkClient } = requireApi("@clerk/backend");

config({ path: resolve(root, ".env") });

const BATCH = 50;
const VACANCY_RATE = 0.05;

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function findOrCreateClerkUser(clerk, { username, email, password, fullName }) {
  const existing = await clerk.users.getUserList({ username: [username], limit: 1 });
  if (existing.data[0]) return existing.data[0];

  const byEmail = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
  if (byEmail.data[0]) return byEmail.data[0];

  const { firstName, lastName } = splitName(fullName);
  return clerk.users.createUser({
    username,
    password,
    emailAddress: [email],
    firstName,
    lastName: lastName || undefined,
    skipPasswordChecks: true,
    skipPasswordRequirement: false,
  });
}

function fakeClerkId(prefix, slug, role) {
  const base = `${prefix}_${slug}_${role}`.replace(/[^a-zA-Z0-9_]/g, "_");
  return base.slice(0, 64);
}

async function resetDemoHostels(prisma) {
  const hostels = await prisma.hostel.findMany({
    where: {
      OR: DEMO_SLUG_PREFIXES.map((p) => ({ slug: { startsWith: p } })),
    },
    select: { id: true, slug: true },
  });

  if (hostels.length === 0) {
    console.log("No demo hostels to reset.");
    return;
  }

  const ids = hostels.map((h) => h.id);
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { hostelId: { in: ids } } }),
    prisma.invoice.deleteMany({ where: { hostelId: { in: ids } } }),
    prisma.feePlan.deleteMany({ where: { hostelId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { hostelId: { in: ids } } }),
    prisma.allotment.deleteMany({ where: { hostelId: { in: ids } } }),
    prisma.bed.deleteMany({
      where: { room: { floor: { block: { hostelId: { in: ids } } } } },
    }),
    prisma.room.deleteMany({
      where: { floor: { block: { hostelId: { in: ids } } } },
    }),
    prisma.floor.deleteMany({ where: { block: { hostelId: { in: ids } } } }),
    prisma.block.deleteMany({ where: { hostelId: { in: ids } } }),
    prisma.resident.deleteMany({ where: { hostelId: { in: ids } } }),
    prisma.membershipInvite.deleteMany({ where: { hostelId: { in: ids } } }),
    prisma.membership.deleteMany({ where: { hostelId: { in: ids } } }),
    prisma.hostel.deleteMany({ where: { id: { in: ids } } }),
  ]);

  console.log(`Removed ${hostels.length} demo hostels: ${hostels.map((h) => h.slug).join(", ")}`);
}

async function upsertMembership(prisma, hostelId, clerkUserId, role) {
  await prisma.membership.upsert({
    where: {
      hostelId_clerkUserId: { hostelId, clerkUserId },
    },
    update: { role },
    create: { hostelId, clerkUserId, role },
  });
}

async function buildHostelStructure(prisma, hostel, spec, rng) {
  const beds = [];
  let residentSeq = 0;

  for (const blockSpec of spec.blocks) {
    const block = await prisma.block.create({
      data: {
        hostelId: hostel.id,
        name: blockSpec.name,
        code: blockSpec.code,
      },
    });

    for (let level = 1; level <= blockSpec.floors; level++) {
      const floor = await prisma.floor.create({
        data: {
          blockId: block.id,
          name: `Floor ${level}`,
          level,
        },
      });

      for (let roomNum = 1; roomNum <= blockSpec.roomsPerFloor; roomNum++) {
        const bedCount = Math.min(
          3,
          bedCountForRoom(rng, blockSpec.bedPattern, roomNum, level),
        );
        const roomNumber = `${blockSpec.code}${level}${String(roomNum).padStart(2, "0")}`;

        const room = await prisma.room.create({
          data: {
            floorId: floor.id,
            number: roomNumber,
            capacity: bedCount,
            beds: {
              create: bedLabels(bedCount).map((label) => ({
                label,
                status: BedStatus.VACANT,
              })),
            },
          },
          include: { beds: true },
        });

        for (const bed of room.beds) {
          beds.push({
            bedId: bed.id,
            gender: residentGender(spec.gender, rng, blockSpec.name),
            seq: ++residentSeq,
          });
        }
      }
    }
  }

  return beds;
}

async function occupyBeds(prisma, hostelId, hostelSlug, bedEntries, rng) {
  const vacantCount = Math.max(1, Math.floor(bedEntries.length * VACANCY_RATE));
  const toOccupy = shuffle(rng, bedEntries).slice(vacantCount);

  for (let i = 0; i < toOccupy.length; i += BATCH) {
    const chunk = toOccupy.slice(i, i + BATCH);
    await prisma.$transaction(async (tx) => {
      for (const entry of chunk) {
        const profile = makeResidentProfile(
          rng,
          entry.gender,
          hostelSlug,
          entry.seq,
        );

        const resident = await tx.resident.create({
          data: {
            hostelId,
            fullName: profile.fullName,
            phone: profile.phone,
            email: profile.email,
            idType: profile.idType,
            idNumber: profile.idNumber,
            guardianName: profile.guardianName,
            guardianPhone: profile.guardianPhone,
            status: ResidentStatus.ACTIVE,
          },
        });

        await tx.bed.update({
          where: { id: entry.bedId },
          data: { status: BedStatus.OCCUPIED },
        });

        await tx.allotment.create({
          data: {
            hostelId,
            residentId: resident.id,
            bedId: entry.bedId,
            status: AllotmentStatus.ACTIVE,
            startAt: new Date(Date.now() - Math.floor(rng() * 180) * 86_400_000),
          },
        });
      }
    });
  }

  return { total: bedEntries.length, occupied: toOccupy.length, vacant: vacantCount };
}

async function seedBilling(prisma, hostelId, recordedById, rng) {
  const residents = await prisma.resident.findMany({
    where: { hostelId, status: ResidentStatus.ACTIVE },
    select: { id: true },
  });
  if (residents.length === 0) return { invoices: 0, payments: 0 };

  const plan = await prisma.feePlan.create({
    data: {
      hostelId,
      name: "Standard monthly",
      isDefault: true,
      lines: {
        create: [
          { label: "Monthly rent", kind: FeeLineKind.RENT, amountPaise: 800_000 },
          { label: "Mess charges", kind: FeeLineKind.MESS, amountPaise: 350_000 },
          { label: "Security deposit", kind: FeeLineKind.DEPOSIT, amountPaise: 500_000 },
        ],
      },
    },
    include: { lines: true },
  });

  const totalPaise = plan.lines.reduce((s, l) => s + l.amountPaise, 0);
  const now = new Date();
  let month = now.getUTCMonth();
  let year = now.getUTCFullYear();
  const periods = [];
  for (let i = 0; i < 2; i++) {
    periods.push({ year, month });
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }

  const billedResidents = shuffle(rng, residents).slice(
    0,
    Math.max(1, Math.floor(residents.length * 0.6)),
  );

  let invoiceCount = 0;
  let paymentCount = 0;

  for (const resident of billedResidents) {
    for (const { year: y, month: m } of periods) {
      const periodStart = new Date(Date.UTC(y, m, 1));
      const periodEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      const dueAt = new Date(periodEnd);
      dueAt.setUTCDate(dueAt.getUTCDate() + 7);

      const existing = await prisma.invoice.findUnique({
        where: {
          residentId_periodStart: { residentId: resident.id, periodStart },
        },
      });
      if (existing) continue;

      const roll = rng();
      const issuedAt = new Date(
        Date.now() - Math.floor(rng() * 45) * 86_400_000,
      );

      const invoice = await prisma.invoice.create({
        data: {
          hostelId,
          residentId: resident.id,
          feePlanId: plan.id,
          periodStart,
          periodEnd,
          status: InvoiceStatus.ISSUED,
          amountPaise: totalPaise,
          balancePaise: totalPaise,
          issuedAt,
          dueAt,
          lines: {
            create: plan.lines.map((l) => ({
              label: l.label,
              kind: l.kind,
              amountPaise: l.amountPaise,
            })),
          },
        },
      });
      invoiceCount += 1;

      if (roll < 0.35) {
        await prisma.payment.create({
          data: {
            hostelId,
            invoiceId: invoice.id,
            amountPaise: totalPaise,
            method: PaymentMethod.UPI,
            idempotencyKey: `seed-${invoice.id}-full`,
            recordedById,
            receivedAt: new Date(issuedAt.getTime() + 86_400_000 * 3),
          },
        });
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.PAID, balancePaise: 0 },
        });
        paymentCount += 1;
      } else if (roll < 0.55) {
        const partial = Math.floor(totalPaise * (0.3 + rng() * 0.4));
        const methods = [PaymentMethod.CASH, PaymentMethod.UPI, PaymentMethod.BANK];
        await prisma.payment.create({
          data: {
            hostelId,
            invoiceId: invoice.id,
            amountPaise: partial,
            method: methods[Math.floor(rng() * methods.length)],
            idempotencyKey: `seed-${invoice.id}-partial`,
            recordedById,
          },
        });
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.PARTIAL,
            balancePaise: totalPaise - partial,
          },
        });
        paymentCount += 1;
      }
    }
  }

  return { invoices: invoiceCount, payments: paymentCount };
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required in root .env");
    process.exit(1);
  }

  const skipClerk = hasFlag("--skip-clerk");
  if (!skipClerk && !process.env.CLERK_SECRET_KEY?.trim()) {
    console.error("CLERK_SECRET_KEY is required (or pass --skip-clerk)");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const clerk = skipClerk
    ? null
    : createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  const summary = {
    owners: [],
    hostels: [],
    totals: { beds: 0, occupied: 0, vacant: 0, residents: 0, staff: 0, invoices: 0, payments: 0 },
  };

  try {
    if (hasFlag("--reset")) {
      await resetDemoHostels(prisma);
    }

    let hostelIndex = 0;

    for (const owner of OWNERS) {
      let ownerClerkId;
      if (skipClerk) {
        ownerClerkId = fakeClerkId("demo_owner", owner.username, "admin");
      } else {
        const user = await findOrCreateClerkUser(clerk, {
          username: owner.username,
          email: owner.email,
          password: DEMO_PASSWORD,
          fullName: owner.fullName,
        });
        ownerClerkId = user.id;
        console.log(`Owner ${owner.fullName}: ${ownerClerkId} (${owner.username})`);
      }

      summary.owners.push({
        name: owner.fullName,
        username: owner.username,
        password: DEMO_PASSWORD,
        clerkUserId: ownerClerkId,
        hostelCount: owner.hostels.length,
      });

      for (const spec of owner.hostels) {
        const rng = createRng(
          spec.slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0),
        );

        const existing = await prisma.hostel.findUnique({ where: { slug: spec.slug } });
        if (existing) {
          console.log(`Skipping existing hostel ${spec.slug} (use --reset first)`);
          continue;
        }

        const hostel = await prisma.hostel.create({
          data: {
            name: spec.name,
            slug: spec.slug,
            address: spec.address,
          },
        });

        await upsertMembership(prisma, hostel.id, ownerClerkId, Role.ADMIN);

        const staffPair = STAFF_NAMES[hostelIndex % STAFF_NAMES.length];
        const wardenCreds = staffUsernames(spec.slug, "warden");
        const accountantCreds = staffUsernames(spec.slug, "accountant");

        let wardenId;
        let accountantId;

        if (skipClerk) {
          wardenId = fakeClerkId("demo_staff", spec.slug, "warden");
          accountantId = fakeClerkId("demo_staff", spec.slug, "accountant");
        } else {
          const wardenUser = await findOrCreateClerkUser(clerk, {
            username: wardenCreds.username,
            email: wardenCreds.email,
            password: DEMO_PASSWORD,
            fullName: staffPair.warden,
          });
          const accountantUser = await findOrCreateClerkUser(clerk, {
            username: accountantCreds.username,
            email: accountantCreds.email,
            password: DEMO_PASSWORD,
            fullName: staffPair.accountant,
          });
          wardenId = wardenUser.id;
          accountantId = accountantUser.id;
        }

        await upsertMembership(prisma, hostel.id, wardenId, Role.WARDEN);
        await upsertMembership(prisma, hostel.id, accountantId, Role.ACCOUNTANT);
        summary.totals.staff += 2;

        const bedEntries = await buildHostelStructure(prisma, hostel, spec, rng);
        const occupancy = await occupyBeds(
          prisma,
          hostel.id,
          spec.slug,
          bedEntries,
          rng,
        );

        const billing = await seedBilling(prisma, hostel.id, accountantId, rng);
        summary.totals.invoices += billing.invoices;
        summary.totals.payments += billing.payments;

        summary.totals.beds += occupancy.total;
        summary.totals.occupied += occupancy.occupied;
        summary.totals.vacant += occupancy.vacant;
        summary.totals.residents += occupancy.occupied;

        summary.hostels.push({
          slug: spec.slug,
          name: spec.name,
          owner: owner.fullName,
          beds: occupancy.total,
          occupied: occupancy.occupied,
          vacant: occupancy.vacant,
          invoices: billing.invoices,
          payments: billing.payments,
          warden: { name: staffPair.warden, username: wardenCreds.username },
          accountant: { name: staffPair.accountant, username: accountantCreds.username },
        });

        console.log(
          `  ${spec.name}: ${occupancy.total} beds, ${occupancy.occupied} occupied, ${billing.invoices} invoices, ${billing.payments} payments`,
        );

        hostelIndex++;
      }
    }

    const vacancyPct = ((summary.totals.vacant / summary.totals.beds) * 100).toFixed(1);

    console.log(`
═══════════════════════════════════════════════════════════
Demo data seeded

  Owners:     ${summary.owners.length} (3, 5, and 8 hostels)
  Hostels:    ${summary.hostels.length}
  Beds:       ${summary.totals.beds}
  Residents:  ${summary.totals.residents} (${vacancyPct}% beds vacant)
  Invoices:   ${summary.totals.invoices}
  Payments:   ${summary.totals.payments}
  Staff:      ${summary.totals.staff} wardens/accountants + owner admins

Owner sign-in (password for all: ${DEMO_PASSWORD})
${summary.owners
  .map(
    (o) =>
      `  • ${o.name} — username: ${o.username} — ${o.hostelCount} hostels`,
  )
  .join("\n")}

Sample hostels:
${summary.hostels
  .slice(0, 5)
  .map((h) => `  • ${h.slug} (${h.beds} beds)`)
  .join("\n")}
  … and ${Math.max(0, summary.hostels.length - 5)} more

Sign in at http://localhost:3000/sign-in — pick any owner username above.
Use Settings → switch hostel context if your session supports multiple hostels.
`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
