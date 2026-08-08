import {
  DashboardShell,
  loadDashboardSession,
} from "@/components/layout/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { ROLE_LABELS } from "@/lib/permissions";
import {
  isAuthBypassMisconfigured,
  isAuthDevBypass,
  isClerkConfigured,
} from "@/lib/utils";
import { prisma } from "@/lib/db";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await loadDashboardSession();
  const bypassMismatch = isAuthBypassMisconfigured();

  const [hostel, members] = await Promise.all([
    prisma.hostel.findUniqueOrThrow({ where: { id: session.hostelId } }),
    prisma.membership.findMany({
      where: { hostelId: session.hostelId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <DashboardShell
      session={session}
      title="Settings"
      description="Hostel profile, staff memberships, and environment status."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Settings" },
      ]}
    >
      {bypassMismatch ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-(--status-partial) bg-(--status-partial-bg) px-4 py-3 text-sm text-(--color-ink)"
        >
          Bypass flags mismatch — set both{" "}
          <code className="font-mono text-xs">AUTH_DEV_BYPASS</code> and{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_AUTH_DEV_BYPASS</code>{" "}
          equally, then restart.
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <dl className="space-y-4 rounded-lg border border-(--color-border) bg-(--color-paper) p-5 text-sm">
          <h2 className="font-display text-lg text-(--color-ink)">Session</h2>
          <div className="flex justify-between gap-4">
            <dt className="text-(--color-muted)">You</dt>
            <dd className="font-medium text-(--color-ink)">
              {session.fullName ?? session.email ?? session.userId.slice(0, 12)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-(--color-muted)">Role</dt>
            <dd className="font-medium text-(--color-ink)">
              {ROLE_LABELS[session.role]}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-(--color-muted)">Hostel</dt>
            <dd className="font-medium text-(--color-ink)">{hostel.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-(--color-muted)">Clerk</dt>
            <dd className="font-medium text-(--color-ink)">
              {isClerkConfigured() ? "Configured" : "Missing keys"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-(--color-muted)">Auth bypass</dt>
            <dd className="font-medium text-(--color-ink)">
              {isAuthDevBypass() ? "On (dev only)" : "Off"}
            </dd>
          </div>
        </dl>

        <div className="rounded-lg border border-(--color-border) bg-(--color-paper) p-5">
          <h2 className="font-display text-lg text-(--color-ink)">Hostel</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-(--color-muted)">Slug</dt>
              <dd className="font-mono text-xs text-(--color-ink)">
                {hostel.slug}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-(--color-muted)">Address</dt>
              <dd className="text-(--color-ink)">{hostel.address ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-(--color-muted)">Clerk org</dt>
              <dd className="font-mono text-xs text-(--color-ink)">
                {hostel.clerkOrgId ?? "Not linked"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-display text-lg text-(--color-ink)">
            Staff memberships
          </h2>
          <StatusPill tone="neutral">{members.length}</StatusPill>
        </div>
        <DataTable
          rows={members}
          rowKey={(m) => m.id}
          empty={
            <EmptyState
              title="No members"
              body="Sign in with Clerk to bootstrap the first admin membership."
            />
          }
          columns={[
            {
              key: "user",
              header: "Clerk user",
              cell: (m) => (
                <span className="font-mono text-xs">{m.clerkUserId}</span>
              ),
            },
            {
              key: "role",
              header: "Role",
              cell: (m) => ROLE_LABELS[m.role],
            },
            {
              key: "joined",
              header: "Joined",
              cell: (m) => m.createdAt.toISOString().slice(0, 10),
            },
          ]}
        />
      </section>
    </DashboardShell>
  );
}
