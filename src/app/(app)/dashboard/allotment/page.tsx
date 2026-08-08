import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Allotment" };

export default function AllotmentPage() {
  return (
    <AppShell
      title="Allotment"
      description="Assign, transfer, and vacate with SQL transactions. Week 2."
      actions={<Button disabled>Assign bed</Button>}
    >
      <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-12 text-center">
        <p className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          Allotment wizard coming next
        </p>
        <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">
          One active allotment per bed and per resident — enforced in Postgres.
        </p>
      </div>
    </AppShell>
  );
}
