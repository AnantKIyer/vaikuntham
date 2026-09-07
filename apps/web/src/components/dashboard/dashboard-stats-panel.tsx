import { StatusPill } from "@/components/ui/status-pill";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";
import {
  isAuthBypassMisconfigured,
  isAuthDevBypass,
  isClerkConfigured,
} from "@/lib/utils";
import {
  API_ROUTES,
  can,
  formatPaise,
  type BillingSummaryDto,
  type DashboardActivityDto,
  type PageWithSession,
} from "@vaikuntham/shared";
import { ROLE_LABELS } from "@vaikuntham/shared";

type DashboardStats = {
  bedCount: number;
  occupiedCount: number;
  auditCount: number | null;
  memberCount: number | null;
};

function formatActivityTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  let billing: BillingSummaryDto | null = null;
  let activity: DashboardActivityDto | null = null;

  if (can(session.role, "viewReports")) {
    const [billingResult, activityResult] = await Promise.all([
      apiFetch<BillingSummaryDto>(API_ROUTES.fees.summary),
      apiFetch<DashboardActivityDto>(API_ROUTES.dashboard.activity),
    ]);
    redirectOnApiAuthFailure(billingResult);
    redirectOnApiAuthFailure(activityResult);
    if (billingResult.ok) billing = billingResult.data;
    if (activityResult.ok) activity = activityResult.data;
  }

  const occupancy =
    bedCount === 0 ? "—" : `${Math.round((occupiedCount / bedCount) * 100)}%`;

  const clerkReady = isClerkConfigured();
  const bypass = isAuthDevBypass();
  const bypassMismatch = isAuthBypassMisconfigured();

  const kpis: { label: string; value: string; hint: string }[] = [
    { label: "Beds", value: String(bedCount), hint: "Across all blocks" },
    {
      label: "Occupancy",
      value: occupancy,
      hint: `${occupiedCount} occupied`,
    },
  ];
  if (memberCount !== null) {
    kpis.push({
      label: "Staff members",
      value: String(memberCount),
      hint: ROLE_LABELS[session.role],
    });
  }
  if (auditCount !== null) {
    kpis.push({
      label: "Audit events",
      value: String(auditCount),
      hint: "Sensitive actions",
    });
  }
  if (billing) {
    kpis.push({
      label: "Open dues",
      value: formatPaise(billing.openDuesPaise),
      hint: "Unpaid invoice balance",
    });
    kpis.push({
      label: "Collected MTD",
      value: formatPaise(billing.collectedMtdPaise),
      hint: "Payments this month",
    });
  }

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
        {kpis.map((kpi) => (
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
          Recent activity
        </h2>
        {activity && activity.items.length > 0 ? (
          <ul className="mt-4 divide-y divide-(--color-border)">
            {activity.items.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-(--color-ink)">
                    {item.title}
                  </p>
                  <p className="text-xs text-(--color-muted)">{item.subtitle}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusPill tone={item.kind === "payment" ? "vacant" : "partial"}>
                    {item.kind === "payment" ? "Payment" : "Allotment"}
                  </StatusPill>
                  <time
                    dateTime={item.occurredAt}
                    className="text-xs text-(--color-muted)"
                  >
                    {formatActivityTime(item.occurredAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-(--color-muted)">
            No recent allotments or payments yet.
          </p>
        )}
        {!clerkReady && !bypass ? (
          <p className="mt-4 text-xs text-(--color-muted)">
            Configure Clerk or enable dev bypass to sign in and record activity.
          </p>
        ) : null}
      </section>
    </>
  );
}
