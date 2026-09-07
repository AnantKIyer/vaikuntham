import { Test } from "@nestjs/testing";
import { FeeLineKind, InvoiceStatus, Role } from "@vaikuntham/db";
import type { SessionContext } from "@vaikuntham/shared";
import { FeesService } from "../../src/fees/fees.service";
import { PaymentsService } from "../../src/payments/payments.service";
import { AuditModule } from "../../src/audit/audit.module";
import { FeesModule } from "../../src/fees/fees.module";
import { PaymentsModule } from "../../src/payments/payments.module";
import { PrismaModule } from "../../src/prisma/prisma.module";
import { prisma, resetDatabase } from "./helpers";

function accountantSession(hostelId: string): SessionContext {
  return {
    userId: "user_accountant",
    hostelId,
    role: Role.ACCOUNTANT,
    email: "acct@test.com",
  };
}

describe("billing (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedBillingFixture() {
    const hostel = await prisma.hostel.create({
      data: { name: "Billing Hostel", slug: "billing-hostel" },
    });
    const resident = await prisma.resident.create({
      data: {
        hostelId: hostel.id,
        fullName: "Billing Resident",
        status: "ACTIVE",
      },
    });
    const plan = await prisma.feePlan.create({
      data: {
        hostelId: hostel.id,
        name: "Standard",
        isDefault: true,
        lines: {
          create: [
            {
              label: "Rent",
              kind: FeeLineKind.RENT,
              amountPaise: 100_000,
            },
          ],
        },
      },
      include: { lines: true },
    });
    return { hostel, resident, plan };
  }

  it("generates invoice, records partial then full payment", async () => {
    const { hostel, resident } = await seedBillingFixture();
    const session = accountantSession(hostel.id);

    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule, FeesModule, PaymentsModule],
    }).compile();
    const fees = moduleRef.get(FeesService);
    const payments = moduleRef.get(PaymentsService);

    const invoice = await fees.generateInvoice(session, {
      residentId: resident.id,
      periodStart: "2026-08",
    });
    expect(invoice.amountPaise).toBe(100_000);
    expect(invoice.balancePaise).toBe(100_000);
    expect(invoice.status).toBe(InvoiceStatus.ISSUED);

    const partial = await payments.recordPayment(session, {
      invoiceId: invoice.id,
      amountPaise: 40_000,
      method: "UPI",
      idempotencyKey: "test-partial-1",
    });
    expect(partial.invoice.balancePaise).toBe(60_000);
    expect(partial.invoice.status).toBe(InvoiceStatus.PARTIAL);

    const full = await payments.recordPayment(session, {
      invoiceId: invoice.id,
      amountPaise: 60_000,
      method: "CASH",
      idempotencyKey: "test-full-1",
    });
    expect(full.invoice.balancePaise).toBe(0);
    expect(full.invoice.status).toBe(InvoiceStatus.PAID);

    const dues = await payments.listDues(hostel.id);
    expect(dues.totalOpenPaise).toBe(0);
  });

  it("rejects duplicate invoice for same resident and period", async () => {
    const { hostel, resident } = await seedBillingFixture();
    const session = accountantSession(hostel.id);

    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule, FeesModule, PaymentsModule],
    }).compile();
    const fees = moduleRef.get(FeesService);

    await fees.generateInvoice(session, {
      residentId: resident.id,
      periodStart: "2026-07",
    });

    await expect(
      fees.generateInvoice(session, {
        residentId: resident.id,
        periodStart: "2026-07",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("returns same payment on idempotent replay", async () => {
    const { hostel, resident } = await seedBillingFixture();
    const session = accountantSession(hostel.id);

    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule, FeesModule, PaymentsModule],
    }).compile();
    const fees = moduleRef.get(FeesService);
    const payments = moduleRef.get(PaymentsService);

    const invoice = await fees.generateInvoice(session, {
      residentId: resident.id,
      periodStart: "2026-09",
    });

    const first = await payments.recordPayment(session, {
      invoiceId: invoice.id,
      amountPaise: 25_000,
      method: "UPI",
      idempotencyKey: "idem-replay-1",
    });

    const replay = await payments.recordPayment(session, {
      invoiceId: invoice.id,
      amountPaise: 25_000,
      method: "UPI",
      idempotencyKey: "idem-replay-1",
    });

    expect(replay.payment.id).toBe(first.payment.id);
    expect(replay.invoice.balancePaise).toBe(first.invoice.balancePaise);
  });

  it("lists dues via SQL aggregate sorted by balance", async () => {
    const { hostel, resident } = await seedBillingFixture();
    const session = accountantSession(hostel.id);

    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuditModule, FeesModule, PaymentsModule],
    }).compile();
    const fees = moduleRef.get(FeesService);
    const payments = moduleRef.get(PaymentsService);

    const residentB = await prisma.resident.create({
      data: {
        hostelId: hostel.id,
        fullName: "Higher Dues Resident",
        status: "ACTIVE",
      },
    });

    await fees.generateInvoice(session, {
      residentId: resident.id,
      periodStart: "2026-06",
    });
    await fees.generateInvoice(session, {
      residentId: residentB.id,
      periodStart: "2026-06",
    });

    const invB = await fees.generateInvoice(session, {
      residentId: residentB.id,
      periodStart: "2026-05",
    });
    await payments.recordPayment(session, {
      invoiceId: invB.id,
      amountPaise: 20_000,
      method: "CASH",
      idempotencyKey: "dues-partial-b",
    });

    const dues = await payments.listDues(hostel.id);
    expect(dues.rows.length).toBeGreaterThanOrEqual(2);
    expect(dues.rows[0]!.openBalancePaise).toBeGreaterThanOrEqual(
      dues.rows[1]!.openBalancePaise,
    );
    expect(dues.rows[0]!.dueAgeDays).not.toBeNull();
  });
});
