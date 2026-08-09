import { InvitesPanel } from "@/components/settings/invites-panel";
import { StaffMembershipsPanel } from "@/components/settings/staff-memberships-panel";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";
import {
  isAuthBypassMisconfigured,
  isAuthDevBypass,
  isClerkConfigured,
} from "@/lib/utils";
import {
  API_ROUTES,
  ROLE_LABELS,
  type HostelSettingsDto,
  type MembershipInviteDto,
  type PageWithSession,
} from "@vaikuntham/shared";

export async function SettingsPanel() {
  const [settingsResult, invitesResult] = await Promise.all([
    apiFetch<PageWithSession<HostelSettingsDto>>(API_ROUTES.settings),
    apiFetch<MembershipInviteDto[]>(API_ROUTES.memberships.invites),
  ]);
  redirectOnApiAuthFailure(settingsResult);
  redirectOnApiAuthFailure(invitesResult);
  if (!settingsResult.ok) throw new Error(settingsResult.error);
  if (!invitesResult.ok) throw new Error(invitesResult.error);

  const { session, hostel, members } = settingsResult.data;
  const bypassMismatch = isAuthBypassMisconfigured();

  return (
    <>
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

      <StaffMembershipsPanel
        members={members}
        currentUserId={session.userId}
      />

      <InvitesPanel
        invites={invitesResult.data}
        clerkOrgId={hostel.clerkOrgId}
      />
    </>
  );
}
