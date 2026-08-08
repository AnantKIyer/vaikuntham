import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Residents" };

export default function ResidentsPage() {
  return (
    <AppShell
      title="Residents"
      description="Profiles, guardians, and status. Search and CRUD in Week 2."
      actions={<Button disabled>Add resident</Button>}
    >
      <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-12 text-center">
        <p className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          No residents yet
        </p>
        <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">
          Resident records will appear here once the database is migrated and seed data is loaded.
        </p>
      </div>
    </AppShell>
  );
}
