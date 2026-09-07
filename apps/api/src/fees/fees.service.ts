import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  FeeLineKind,
  InvoiceStatus,
  Prisma,
} from "@vaikuntham/db";
import type {
  BillingResidentsListDto,
  BillingSummaryDto,
  CreateFeePlanInput,
  FeePlanDto,
  FeePlansListDto,
  GenerateInvoiceInput,
  InvoiceDto,
  InvoicesListDto,
  SessionContext,
} from "@vaikuntham/shared";
import { OPEN_INVOICE_STATUSES } from "@vaikuntham/shared";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

const invoiceInclude = {
  resident: { select: { fullName: true } },
  feePlan: { select: { name: true } },
  lines: { orderBy: { label: "asc" as const } },
} satisfies Prisma.InvoiceInclude;

@Injectable()
export class FeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listPlans(hostelId: string): Promise<FeePlansListDto> {
    const plans = await this.prisma.feePlan.findMany({
      where: { hostelId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: { lines: { orderBy: { label: "asc" } } },
    });
    return { plans: plans.map((p) => this.toPlanDto(p)) };
  }

  async listBillingResidents(hostelId: string): Promise<BillingResidentsListDto> {
    const residents = await this.prisma.resident.findMany({
      where: { hostelId, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, status: true },
    });
    return { residents };
  }

  async createPlan(
    session: SessionContext,
    input: CreateFeePlanInput,
  ): Promise<FeePlanDto> {
    const totalPaise = input.lines.reduce((s, l) => s + l.amountPaise, 0);
    if (totalPaise <= 0) {
      throw new ConflictException({
        ok: false,
        error: "Fee plan total must be positive",
      });
    }

    const plan = await this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.feePlan.updateMany({
          where: { hostelId: session.hostelId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const created = await tx.feePlan.create({
        data: {
          hostelId: session.hostelId,
          name: input.name,
          description: input.description ?? null,
          isDefault: input.isDefault ?? false,
          lines: {
            create: input.lines.map((line) => ({
              label: line.label,
              kind: line.kind as FeeLineKind,
              amountPaise: line.amountPaise,
            })),
          },
        },
        include: { lines: { orderBy: { label: "asc" } } },
      });

      await this.audit.write({
        actorId: session.userId,
        action: "fee_plan.create",
        entityType: "FeePlan",
        entityId: created.id,
        hostelId: session.hostelId,
        metadata: { name: created.name, totalPaise },
      });

      return created;
    });

    return this.toPlanDto(plan);
  }

  async listInvoices(
    hostelId: string,
    filters?: { residentId?: string; status?: string },
  ): Promise<InvoicesListDto> {
    const statusFilter =
      filters?.status &&
      (["ISSUED", "PARTIAL", "PAID", "VOID", "DRAFT"] as string[]).includes(
        filters.status,
      )
        ? (filters.status as InvoiceStatus)
        : undefined;

    const invoices = await this.prisma.invoice.findMany({
      where: {
        hostelId,
        ...(filters?.residentId ? { residentId: filters.residentId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
      include: invoiceInclude,
    });

    return {
      total: invoices.length,
      invoices: invoices.map((inv) => this.toInvoiceDto(inv)),
    };
  }

  async getInvoice(hostelId: string, id: string): Promise<InvoiceDto> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, hostelId },
      include: invoiceInclude,
    });
    if (!invoice) {
      throw new NotFoundException({ ok: false, error: "Invoice not found" });
    }
    return this.toInvoiceDto(invoice);
  }

  async generateInvoice(
    session: SessionContext,
    input: GenerateInvoiceInput,
  ): Promise<InvoiceDto> {
    const { start: periodStart, end: periodEnd } = parseBillingPeriod(
      input.periodStart,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Resident" WHERE id = ${input.residentId} AND "hostelId" = ${session.hostelId} FOR UPDATE`;

      const resident = await tx.resident.findFirst({
        where: { id: input.residentId, hostelId: session.hostelId },
      });
      if (!resident) {
        throw new NotFoundException({ ok: false, error: "Resident not found" });
      }

      const existing = await tx.invoice.findUnique({
        where: {
          residentId_periodStart: {
            residentId: input.residentId,
            periodStart,
          },
        },
      });
      if (existing && existing.status !== InvoiceStatus.VOID) {
        throw new ConflictException({
          ok: false,
          error: "Invoice already exists for this resident and period",
          code: "INVOICE_EXISTS",
        });
      }

      const plan = await this.resolveFeePlan(
        tx,
        session.hostelId,
        input.feePlanId,
      );

      const amountPaise = plan.lines.reduce((s, l) => s + l.amountPaise, 0);
      const issuedAt = new Date();
      const dueAt = new Date(periodEnd);
      dueAt.setUTCDate(dueAt.getUTCDate() + 7);

      const invoice = await tx.invoice.create({
        data: {
          hostelId: session.hostelId,
          residentId: input.residentId,
          feePlanId: plan.id,
          periodStart,
          periodEnd,
          status: InvoiceStatus.ISSUED,
          amountPaise,
          balancePaise: amountPaise,
          issuedAt,
          dueAt,
          lines: {
            create: plan.lines.map((line) => ({
              label: line.label,
              kind: line.kind,
              amountPaise: line.amountPaise,
            })),
          },
        },
        include: invoiceInclude,
      });

      await this.audit.write({
        actorId: session.userId,
        action: "invoice.generate",
        entityType: "Invoice",
        entityId: invoice.id,
        hostelId: session.hostelId,
        metadata: {
          residentId: input.residentId,
          periodStart: input.periodStart,
          amountPaise,
        },
      });

      return this.toInvoiceDto(invoice);
    });
  }

  async voidInvoice(session: SessionContext, id: string): Promise<InvoiceDto> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} AND "hostelId" = ${session.hostelId} FOR UPDATE`;

      const invoice = await tx.invoice.findFirst({
        where: { id, hostelId: session.hostelId },
        include: { payments: { take: 1 } },
      });
      if (!invoice) {
        throw new NotFoundException({ ok: false, error: "Invoice not found" });
      }
      if (invoice.payments.length > 0) {
        throw new ConflictException({
          ok: false,
          error: "Cannot void an invoice with payments",
        });
      }
      if (invoice.status === InvoiceStatus.VOID) {
        throw new ConflictException({ ok: false, error: "Invoice already void" });
      }

      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.VOID,
          balancePaise: 0,
        },
        include: invoiceInclude,
      });

      await this.audit.write({
        actorId: session.userId,
        action: "invoice.void",
        entityType: "Invoice",
        entityId: id,
        hostelId: session.hostelId,
      });

      return this.toInvoiceDto(updated);
    });
  }

  async billingSummary(hostelId: string): Promise<BillingSummaryDto> {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const [openAgg, collectedAgg, issuedAgg] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          hostelId,
          status: { in: [...OPEN_INVOICE_STATUSES] },
        },
        _sum: { balancePaise: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          hostelId,
          receivedAt: { gte: monthStart },
        },
        _sum: { amountPaise: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          hostelId,
          issuedAt: { gte: monthStart },
          status: { not: InvoiceStatus.VOID },
        },
        _sum: { amountPaise: true },
      }),
    ]);

    return {
      openDuesPaise: openAgg._sum.balancePaise ?? 0,
      collectedMtdPaise: collectedAgg._sum.amountPaise ?? 0,
      issuedMtdPaise: issuedAgg._sum.amountPaise ?? 0,
    };
  }

  async sumOpenDuesPaise(hostelId: string, residentId: string): Promise<number> {
    const agg = await this.prisma.invoice.aggregate({
      where: {
        hostelId,
        residentId,
        status: { in: [...OPEN_INVOICE_STATUSES] },
      },
      _sum: { balancePaise: true },
    });
    return agg._sum.balancePaise ?? 0;
  }

  private async resolveFeePlan(
    tx: Prisma.TransactionClient,
    hostelId: string,
    feePlanId?: string,
  ) {
    if (feePlanId) {
      const plan = await tx.feePlan.findFirst({
        where: { id: feePlanId, hostelId },
        include: { lines: true },
      });
      if (!plan || plan.lines.length === 0) {
        throw new NotFoundException({ ok: false, error: "Fee plan not found" });
      }
      return plan;
    }

    const plan = await tx.feePlan.findFirst({
      where: { hostelId, isDefault: true },
      include: { lines: true },
    });
    if (plan && plan.lines.length > 0) return plan;

    const fallback = await tx.feePlan.findFirst({
      where: { hostelId },
      orderBy: { createdAt: "asc" },
      include: { lines: true },
    });
    if (!fallback || fallback.lines.length === 0) {
      throw new ConflictException({
        ok: false,
        error: "No fee plan configured for this hostel",
        code: "NO_FEE_PLAN",
      });
    }
    return fallback;
  }

  private toPlanDto(
    plan: Prisma.FeePlanGetPayload<{ include: { lines: true } }>,
  ): FeePlanDto {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      isDefault: plan.isDefault,
      lines: plan.lines.map((l) => ({
        id: l.id,
        label: l.label,
        kind: l.kind,
        amountPaise: l.amountPaise,
      })),
      totalPaise: plan.lines.reduce((s, l) => s + l.amountPaise, 0),
      createdAt: plan.createdAt.toISOString(),
    };
  }

  /** Map Prisma invoice row to API DTO (shared by payments idempotency). */
  invoiceToDto(
    invoice: Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>,
  ): InvoiceDto {
    return this.toInvoiceDto(invoice);
  }

  private toInvoiceDto(
    invoice: Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>,
  ): InvoiceDto {
    return {
      id: invoice.id,
      residentId: invoice.residentId,
      residentName: invoice.resident.fullName,
      feePlanId: invoice.feePlanId,
      feePlanName: invoice.feePlan?.name ?? null,
      periodStart: invoice.periodStart.toISOString(),
      periodEnd: invoice.periodEnd.toISOString(),
      status: invoice.status,
      amountPaise: invoice.amountPaise,
      balancePaise: invoice.balancePaise,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      dueAt: invoice.dueAt?.toISOString() ?? null,
      lines: invoice.lines.map((l) => ({
        id: l.id,
        label: l.label,
        kind: l.kind,
        amountPaise: l.amountPaise,
      })),
      createdAt: invoice.createdAt.toISOString(),
    };
  }
}

export function parseBillingPeriod(period: string): {
  start: Date;
  end: Date;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) {
    throw new ConflictException({
      ok: false,
      error: "Invalid billing period",
    });
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new ConflictException({
      ok: false,
      error: "Invalid billing period month",
    });
  }
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}
