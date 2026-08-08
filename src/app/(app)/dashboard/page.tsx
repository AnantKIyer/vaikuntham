import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { isAuthDevBypass, isClerkConfigured } from "@/lib/utils";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  const clerkReady = isClerkConfigured();
  const bypass = isAuthDevBypass();

  return (
    <AppShell
      title="Dashboard"
      description="Occupancy and collections at a glance. Full KPIs land in Week 3."
      actions={
        <Link href="/dashboard/allotment">
          <Button>Assign bed</Button>
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Beds", value: "—", hint: "Connect Neon to load" },
          { label: "Occupancy", value: "—", hint: "Vacant / total" },
          { label: "Dues outstanding", value: "—", hint: "Week 3 billing" },
          { label: "Collected MTD", value: "—", hint: "Week 3 billing" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              {kpi.label}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          Foundation checklist
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-[var(--color-ink-soft)]">
          <li className="flex items-center gap-2">
            <StatusPill tone="occupied">Done</StatusPill>
            Next.js App Router + Tailwind tokens + app shell
          </li>
          <li className="flex items-center gap-2">
            <StatusPill tone="occupied">Done</StatusPill>
            Prisma schema (hostel → beds, residents, allotment, audit)
          </li>
          <li className="flex items-center gap-2">
            <StatusPill tone={clerkReady || bypass ? "vacant" : "partial"}>
              {clerkReady || bypass ? "Ready" : "Needs keys"}
            </StatusPill>
            Clerk auth wiring {bypass ? "(dev bypass on)" : ""}
          </li>
          <li className="flex items-center gap-2">
            <StatusPill tone="partial">Next</StatusPill>
            Add Neon <code className="rounded bg-[var(--color-surface)] px-1">DATABASE_URL</code>{" "}
            and run <code className="rounded bg-[var(--color-surface)] px-1">npm run db:migrate</code>
          </li>
        </ul>
      </section>
    </AppShell>
  );
}
