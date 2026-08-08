import Link from "next/link";
import {
  DashboardShell,
  loadDashboardSession,
} from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { can, ROLE_LABELS } from "@/lib/permissions";
import {
  isAuthBypassMisconfigured,
  isAuthDevBypass,
  isClerkConfigured,
} from "@/lib/utils";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await loadDashboardSession();
  const clerkReady = isClerkConfigured();
  const bypass = isAuthDevBypass();
  const bypassMismatch = isAuthBypassMisconfigured();
  const canAllot = can(session.role, "manageAllotment");

  const [bedCount, occupiedCount, auditCount, memberCount] = await Promise.all([
    prisma.bed.count({
      where: { room: { floor: { block: { hostelId: session.hostelId } } } },
    }),
    prisma.bed.count({
      where: {
        status: "OCCUPIED",
        room: { floor: { block: { hostelId: session.hostelId } } },
      },
    }),
    prisma.auditLog.count({ where: { hostelId: session.hostelId } }),
    prisma.membership.count({ where: { hostelId: session.hostelId } }),
  ]);

  const occupancy =
    bedCount === 0 ? "—" : `${Math.round((occupiedCount / bedCount) * 100)}%`;

  return (
    <DashboardShell
      session={session}
      title="Dashboard"
      description="Occupancy snapshot for your hostel. Full collections KPIs land in Week 3."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Dashboard" },
      ]}
      actions={
        canAllot ? (
          <Link href="/dashboard/allotment">
            <Button>Assign bed</Button>
          </Link>
        ) : undefined
      }
    >
      {bypassMismatch ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-(--status-partial) bg-(--status-partial-bg) px-4 py-3 text-sm text-(--color-ink)"
        >
          Auth bypass flags disagree. Set both{" "}
          <code className="font-mono text-xs">AUTH_DEV_BYPASS</code> and{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_AUTH_DEV_BYPASS</code>{" "}
          to the same value, then restart the dev server.
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Beds", value: String(bedCount), hint: "Across all blocks" },
          {
            label: "Occupancy",
            value: occupancy,
            hint: `${occupiedCount} occupied`,
          },
          {
            label: "Staff members",
            value: String(memberCount),
            hint: ROLE_LABELS[session.role],
          },
          {
            label: "Audit events",
            value: String(auditCount),
            hint: "Sensitive actions",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-(--color-border) bg-(--color-paper) px-4 py-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-(--color-muted)">
              {kpi.label}
            </p>
            <p className="mt-2 font-display text-3xl text-(--color-ink)">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-(--color-muted)">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-lg border border-(--color-border) bg-(--color-paper) p-5">
        <h2 className="font-display text-lg text-(--color-ink)">
          Phase 1 status
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-(--color-ink-soft)">
          <li className="flex items-center gap-2">
            <StatusPill tone="vacant">Done</StatusPill>
            Foundation shell, tokens, nav IA
          </li>
          <li className="flex items-center gap-2">
            <StatusPill tone="vacant">Done</StatusPill>
            Neon schema + membership bootstrap
          </li>
          <li className="flex items-center gap-2">
            <StatusPill tone={clerkReady || bypass ? "vacant" : "partial"}>
              {bypass ? "Bypass" : clerkReady ? "Clerk" : "Needs keys"}
            </StatusPill>
            Auth {bypass ? "(dev bypass)" : clerkReady ? "wired" : "pending"}
          </li>
          <li className="flex items-center gap-2">
            <StatusPill tone="partial">Next</StatusPill>
            Week 2 — rooms, residents, allotment
          </li>
        </ul>
      </section>
    </DashboardShell>
  );
}
