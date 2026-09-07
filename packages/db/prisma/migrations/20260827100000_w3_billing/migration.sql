-- W3 billing: fee plans, invoices, payments (integer paise)

CREATE TYPE "FeeLineKind" AS ENUM ('RENT', 'MESS', 'DEPOSIT', 'OTHER');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'VOID');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK', 'OTHER');

CREATE TABLE "FeePlan" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeePlanLine" (
    "id" TEXT NOT NULL,
    "feePlanId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "FeeLineKind" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeePlanLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "feePlanId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "amountPaise" INTEGER NOT NULL,
    "balancePaise" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "FeeLineKind" NOT NULL,
    "amountPaise" INTEGER NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeePlan_hostelId_name_key" ON "FeePlan"("hostelId", "name");
CREATE INDEX "FeePlan_hostelId_idx" ON "FeePlan"("hostelId");

CREATE INDEX "FeePlanLine_feePlanId_idx" ON "FeePlanLine"("feePlanId");

CREATE UNIQUE INDEX "Invoice_residentId_periodStart_key" ON "Invoice"("residentId", "periodStart");
CREATE INDEX "Invoice_hostelId_status_idx" ON "Invoice"("hostelId", "status");
CREATE INDEX "Invoice_hostelId_residentId_idx" ON "Invoice"("hostelId", "residentId");

CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_hostelId_receivedAt_idx" ON "Payment"("hostelId", "receivedAt");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

ALTER TABLE "FeePlan" ADD CONSTRAINT "FeePlan_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeePlanLine" ADD CONSTRAINT "FeePlanLine_feePlanId_fkey" FOREIGN KEY ("feePlanId") REFERENCES "FeePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_feePlanId_fkey" FOREIGN KEY ("feePlanId") REFERENCES "FeePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
