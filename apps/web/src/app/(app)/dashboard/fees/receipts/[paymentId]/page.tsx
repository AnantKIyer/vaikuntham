import {
  API_ROUTES,
  formatPaise,
  type PaymentReceiptDto,
} from "@vaikuntham/shared";
import { DashboardShell, requirePagePermission } from "@/components/layout/dashboard-shell";
import { ReceiptPrintActions } from "@/components/fees/receipt-print-actions";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";

export const metadata = { title: "Payment receipt" };

export default async function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  const session = await requirePagePermission("managePayments");

  const receiptRes = await apiFetch<PaymentReceiptDto>(
    API_ROUTES.payments.one(paymentId),
  );
  redirectOnApiAuthFailure(receiptRes);
  if (!receiptRes.ok) {
    throw new Error(receiptRes.error);
  }

  const receipt = receiptRes.data;
  const receivedAt = new Date(receipt.receivedAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <DashboardShell
      session={session}
      title="Payment receipt"
      description="Printable receipt for recorded payment."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { href: "/dashboard/fees", label: "Fees" },
        { label: "Receipt" },
      ]}
    >
      <ReceiptPrintActions backHref="/dashboard/fees" />

      <article
        id="receipt"
        className="mx-auto max-w-lg rounded-lg border border-(--color-border) bg-(--color-paper) p-8 print:border-0 print:shadow-none"
      >
        <header className="border-b border-(--color-border) pb-4">
          <p className="text-xs uppercase tracking-wide text-(--color-muted)">
            Payment receipt
          </p>
          <h1 className="mt-1 font-display text-2xl text-(--color-ink)">
            {receipt.hostelName}
          </h1>
        </header>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-(--color-muted)">Resident</dt>
            <dd className="text-(--color-ink)">{receipt.residentName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-(--color-muted)">Amount</dt>
            <dd className="font-medium text-(--color-ink)">
              {formatPaise(receipt.amountPaise)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-(--color-muted)">Method</dt>
            <dd className="text-(--color-ink)">{receipt.method}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-(--color-muted)">Received</dt>
            <dd className="text-(--color-ink)">{receivedAt}</dd>
          </div>
          {receipt.reference ? (
            <div className="flex justify-between gap-4">
              <dt className="text-(--color-muted)">Reference</dt>
              <dd className="text-(--color-ink)">{receipt.reference}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-(--color-muted)">Invoice balance</dt>
            <dd className="text-(--color-ink)">
              {formatPaise(receipt.invoice.balancePaise)}
            </dd>
          </div>
        </dl>

        <footer className="mt-8 border-t border-(--color-border) pt-4 text-xs text-(--color-muted)">
          Receipt ID {receipt.id.slice(0, 12)}… · Invoice {receipt.invoiceId.slice(0, 12)}…
        </footer>
      </article>
    </DashboardShell>
  );
}
