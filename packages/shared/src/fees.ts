import { z } from "zod";

export const FeeLineKind = {
  RENT: "RENT",
  MESS: "MESS",
  DEPOSIT: "DEPOSIT",
  OTHER: "OTHER",
} as const;

export type FeeLineKind = (typeof FeeLineKind)[keyof typeof FeeLineKind];

export const FEE_LINE_KIND_VALUES = [
  FeeLineKind.RENT,
  FeeLineKind.MESS,
  FeeLineKind.DEPOSIT,
  FeeLineKind.OTHER,
] as const;

export const InvoiceStatus = {
  DRAFT: "DRAFT",
  ISSUED: "ISSUED",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  VOID: "VOID",
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const INVOICE_STATUS_VALUES = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIAL,
  InvoiceStatus.PAID,
  InvoiceStatus.VOID,
] as const;

export const OPEN_INVOICE_STATUSES = [
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIAL,
] as const;

export const PaymentMethod = {
  CASH: "CASH",
  UPI: "UPI",
  BANK: "BANK",
  OTHER: "OTHER",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PAYMENT_METHOD_VALUES = [
  PaymentMethod.CASH,
  PaymentMethod.UPI,
  PaymentMethod.BANK,
  PaymentMethod.OTHER,
] as const;

/** Display paise as INR (integer paise only in storage). */
export function formatPaise(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const p = abs % 100;
  return `${sign}₹${rupees.toLocaleString("en-IN")}.${String(p).padStart(2, "0")}`;
}

function emptyToUndefined(v: unknown) {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
}

const paiseAmount = z
  .number()
  .int("Amount must be whole paise")
  .positive("Amount must be positive")
  .max(100_000_000, "Amount too large");

export const feePlanLineInputSchema = z.object({
  label: z.string().trim().min(1, "Line label required").max(80),
  kind: z.enum(FEE_LINE_KIND_VALUES),
  amountPaise: paiseAmount,
});

export const createFeePlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name required").max(80),
  description: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(200).optional(),
  ),
  isDefault: z.boolean().optional(),
  lines: z.array(feePlanLineInputSchema).min(1, "At least one line item"),
});

export const generateInvoiceSchema = z.object({
  residentId: z.string().min(1),
  periodStart: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Use YYYY-MM for billing period"),
  feePlanId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amountPaise: paiseAmount,
  method: z.enum(PAYMENT_METHOD_VALUES),
  idempotencyKey: z.string().trim().min(8).max(128),
  reference: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(80).optional(),
  ),
  notes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500).optional(),
  ),
});

export type CreateFeePlanInput = z.infer<typeof createFeePlanSchema>;
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export type FeePlanLineDto = {
  id: string;
  label: string;
  kind: FeeLineKind;
  amountPaise: number;
};

export type FeePlanDto = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  lines: FeePlanLineDto[];
  totalPaise: number;
  createdAt: string;
};

export type FeePlansListDto = {
  plans: FeePlanDto[];
};

export type InvoiceLineDto = {
  id: string;
  label: string;
  kind: FeeLineKind;
  amountPaise: number;
};

export type InvoiceDto = {
  id: string;
  residentId: string;
  residentName: string;
  feePlanId: string | null;
  feePlanName: string | null;
  periodStart: string;
  periodEnd: string;
  status: InvoiceStatus;
  amountPaise: number;
  balancePaise: number;
  issuedAt: string | null;
  dueAt: string | null;
  lines: InvoiceLineDto[];
  createdAt: string;
};

export type InvoicesListDto = {
  total: number;
  invoices: InvoiceDto[];
};

export type PaymentDto = {
  id: string;
  invoiceId: string;
  amountPaise: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  receivedAt: string;
  recordedById: string;
};

export type RecordPaymentResultDto = {
  payment: PaymentDto;
  invoice: InvoiceDto;
};

export type DuesRowDto = {
  residentId: string;
  residentName: string;
  openBalancePaise: number;
  oldestDueAt: string | null;
  /** Days since oldest due date; null when no due date set. */
  dueAgeDays: number | null;
  invoiceCount: number;
};

export type PaymentReceiptDto = PaymentDto & {
  invoice: InvoiceDto;
  residentName: string;
  hostelName: string;
};

export type DashboardActivityItemDto = {
  id: string;
  kind: "allotment" | "payment";
  title: string;
  subtitle: string;
  occurredAt: string;
};

export type DashboardActivityDto = {
  items: DashboardActivityItemDto[];
};

export type DuesListDto = {
  totalOpenPaise: number;
  rows: DuesRowDto[];
};

export type BillingSummaryDto = {
  collectedMtdPaise: number;
  openDuesPaise: number;
  issuedMtdPaise: number;
};

export type BillingResidentDto = {
  id: string;
  fullName: string;
  status: string;
};

export type BillingResidentsListDto = {
  residents: BillingResidentDto[];
};
