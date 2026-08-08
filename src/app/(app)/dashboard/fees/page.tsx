import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Fees" };

export default function FeesPage() {
  return (
    <AppShell
      title="Fees"
      description="Fee plans, invoices, payments, and dues. Week 3."
      actions={<Button disabled>Create invoice</Button>}
    >
      <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-12 text-center">
        <p className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          Billing module not started
        </p>
        <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">
          Amounts will be stored as integer paise. Manual payment recording for the Aug demo.
        </p>
      </div>
    </AppShell>
  );
}
