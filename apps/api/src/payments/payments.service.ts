import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InvoiceStatus, PaymentMethod, Prisma } from "@vaikuntham/db";
import type {
  DuesListDto,
  PaymentReceiptDto,
  RecordPaymentInput,
  RecordPaymentResultDto,
  SessionContext,
} from "@vaikuntham/shared";
import { AuditService } from "../audit/audit.service";
import { FeesService } from "../fees/fees.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly fees: FeesService,
  ) {}

  async recordPayment(
    session: SessionContext,
    input: RecordPaymentInput,
  ): Promise<RecordPaymentResultDto> {
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: {
        invoice: {
          include: {
            resident: { select: { fullName: true } },
            feePlan: { select: { name: true } },
            lines: { orderBy: { label: "asc" } },
          },
        },
      },
    });
    if (existing) {
      if (existing.hostelId !== session.hostelId) {
        throw new ConflictException({
          ok: false,
          error: "Idempotency key already used",
        });
      }
      return {
        payment: this.toPaymentDto(existing),
        invoice: this.fees.invoiceToDto(existing.invoice),
      };
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${input.invoiceId} AND "hostelId" = ${session.hostelId} FOR UPDATE`;

      const invoice = await tx.invoice.findFirst({
        where: { id: input.invoiceId, hostelId: session.hostelId },
        include: {
          resident: { select: { fullName: true } },
          feePlan: { select: { name: true } },
          lines: { orderBy: { label: "asc" } },
        },
      });
      if (!invoice) {
        throw new NotFoundException({ ok: false, error: "Invoice not found" });
      }
      if (
        invoice.status === InvoiceStatus.VOID ||
        invoice.status === InvoiceStatus.PAID
      ) {
        throw new ConflictException({
          ok: false,
          error: "Invoice is not open for payment",
        });
      }
      if (input.amountPaise > invoice.balancePaise) {
        throw new ConflictException({
          ok: false,
          error: "Payment exceeds invoice balance",
          code: "OVERPAYMENT",
        });
      }

      const newBalance = invoice.balancePaise - input.amountPaise;
      const newStatus =
        newBalance === 0
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIAL;

      const payment = await tx.payment.create({
        data: {
          hostelId: session.hostelId,
          invoiceId: invoice.id,
          amountPaise: input.amountPaise,
          method: input.method as PaymentMethod,
          idempotencyKey: input.idempotencyKey,
          reference: input.reference ?? null,
          notes: input.notes ?? null,
          recordedById: session.userId,
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          balancePaise: newBalance,
          status: newStatus,
        },
        include: {
          resident: { select: { fullName: true } },
          feePlan: { select: { name: true } },
          lines: { orderBy: { label: "asc" } },
        },
      });

      await this.audit.write({
        actorId: session.userId,
        action: "payment.record",
        entityType: "Payment",
        entityId: payment.id,
        hostelId: session.hostelId,
        metadata: {
          invoiceId: invoice.id,
          amountPaise: input.amountPaise,
          method: input.method,
        },
      });

      return {
        payment: this.toPaymentDto(payment),
        invoice: this.fees.invoiceToDto(updatedInvoice),
      };
    });
  }

  async listDues(hostelId: string): Promise<DuesListDto> {
    type DuesRow = {
      resident_id: string;
      resident_name: string;
      open_balance_paise: bigint;
      oldest_due_at: Date | null;
      invoice_count: bigint;
    };

    const rows = await this.prisma.$queryRaw<DuesRow[]>(Prisma.sql`
      SELECT
        r.id AS resident_id,
        r."fullName" AS resident_name,
        SUM(i."balancePaise")::bigint AS open_balance_paise,
        MIN(i."dueAt") AS oldest_due_at,
        COUNT(*)::bigint AS invoice_count
      FROM "Invoice" i
      INNER JOIN "Resident" r ON i."residentId" = r.id
      WHERE i."hostelId" = ${hostelId}
        AND i.status IN ('ISSUED'::"InvoiceStatus", 'PARTIAL'::"InvoiceStatus")
        AND i."balancePaise" > 0
      GROUP BY r.id, r."fullName"
      ORDER BY open_balance_paise DESC, oldest_due_at ASC NULLS LAST
    `);

    const now = Date.now();
    const mapped = rows.map((row) => {
      const oldestDueAt = row.oldest_due_at?.toISOString() ?? null;
      const dueAgeDays =
        row.oldest_due_at != null
          ? Math.max(
              0,
              Math.floor(
                (now - row.oldest_due_at.getTime()) / (1000 * 60 * 60 * 24),
              ),
            )
          : null;
      return {
        residentId: row.resident_id,
        residentName: row.resident_name,
        openBalancePaise: Number(row.open_balance_paise),
        oldestDueAt,
        dueAgeDays,
        invoiceCount: Number(row.invoice_count),
      };
    });

    return {
      totalOpenPaise: mapped.reduce((s, r) => s + r.openBalancePaise, 0),
      rows: mapped,
    };
  }

  async getPayment(
    hostelId: string,
    paymentId: string,
  ): Promise<PaymentReceiptDto> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, hostelId },
      include: {
        invoice: {
          include: {
            resident: { select: { fullName: true } },
            feePlan: { select: { name: true } },
            lines: { orderBy: { label: "asc" } },
          },
        },
        hostel: { select: { name: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException({ ok: false, error: "Payment not found" });
    }

    return {
      ...this.toPaymentDto(payment),
      invoice: this.fees.invoiceToDto(payment.invoice),
      residentName: payment.invoice.resident.fullName,
      hostelName: payment.hostel.name,
    };
  }

  private toPaymentDto(
    payment: Prisma.PaymentGetPayload<object>,
  ) {
    return {
      id: payment.id,
      invoiceId: payment.invoiceId,
      amountPaise: payment.amountPaise,
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
      receivedAt: payment.receivedAt.toISOString(),
      recordedById: payment.recordedById,
    };
  }
}
