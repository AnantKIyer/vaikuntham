import { StatusPill } from "@/components/ui/status-pill";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";
import {
  isAuthBypassMisconfigured,
  isAuthDevBypass,
  isClerkConfigured,
} from "@/lib/utils";
import { API_ROUTES, type PageWithSession } from "@vaikuntham/shared";
import { ROLE_LABELS } from "@vaikuntham/shared";

type DashboardStats = {
  bedCount: number;
  occupiedCount: number;
  auditCount: number;
  memberCount: number;
};

export async function DashboardStatsPanel() {
  const statsResult = await apiFetch<PageWithSession<DashboardStats>>(
    API_ROUTES.dashboard.stats,
  );
  redirectOnApiAuthFailure(statsResult);
  if (!statsResult.ok) throw new Error(statsResult.error);

  const {
    session,
    bedCount,
    occupiedCount,
    auditCount,
    memberCount,
  } = statsResult.data;

  const occupancy =
    bedCount === 0 ? "—" : `${Math.round((occupiedCount / bedCount) * 100)}%`;

  const clerkReady = isClerkConfigured();
  const bypass = isAuthDevBypass();
  const bypassMismatch = isAuthBypassMisconfigured();

  return (
    <>
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
          Foundation status
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-(--color-ink-soft)">
          <li className="flex items-center gap-2">
            <StatusPill tone="vacant">Done</StatusPill>
            NestJS API + Next.js web split
          </li>
          <li className="flex items-center gap-2">
            <StatusPill tone="vacant">Done</StatusPill>
            Supabase schema + membership bootstrap
          </li>
          <li className="flex items-center gap-2">
            <StatusPill tone={clerkReady || bypass ? "vacant" : "partial"}>
              {bypass ? "Bypass" : clerkReady ? "Clerk" : "Needs keys"}
            </StatusPill>
            Auth {bypass ? "(dev bypass)" : clerkReady ? "wired" : "pending"}
          </li>
          <li className="flex items-center gap-2">
            <StatusPill tone="partial">Next</StatusPill>
            Residents, allotment, fees
          </li>
        </ul>
      </section>
    </>
  );
}
