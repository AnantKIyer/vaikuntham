"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  API_ROUTES,
  ROLE_LABELS,
  Role,
  createMembershipInviteSchema,
  type ApiFailure,
  type MembershipInviteDto,
} from "@vaikuntham/shared";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, Input, Label } from "@/components/ui/field";
import { useApiClient } from "@/lib/api/client";
import { useAuthFailureHandler } from "@/lib/api/use-auth-failure-handler";

type ActionResult = { ok: true } | ApiFailure;

export function InvitesPanel({
  invites,
  clerkOrgId,
}: {
  invites: MembershipInviteDto[];
  clerkOrgId: string | null;
}) {
  const router = useRouter();
  const api = useApiClient();
  const handleAuthFailure = useAuthFailureHandler();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <section className="mt-6 space-y-4">
      <div>
        <h2 className="font-display text-lg text-(--color-ink)">
          Staff invites
        </h2>
        <p className="mt-1 text-sm text-(--color-muted)">
          Invite-only join: staff must sign in with the linked Clerk org. A
          matching pending invite creates membership on first sign-in.
        </p>
      </div>

      <div className="rounded-lg border border-(--color-border) bg-(--color-paper) p-4 text-sm">
        <p className="font-medium text-(--color-ink)">Clerk org link</p>
        {clerkOrgId ? (
          <p className="mt-1 font-mono text-xs text-(--color-ink)">
            Linked · {clerkOrgId}
          </p>
        ) : (
          <p className="mt-1 text-(--color-muted)">
            Not linked. An operator must run{" "}
            <code className="font-mono text-xs">
              scripts/bootstrap-hostel.mjs --org org_…
            </code>{" "}
            (or{" "}
            <code className="font-mono text-xs">
              PATCH /v1/hostels/:id/link-org
            </code>
            ) before org members can provision.
          </p>
        )}
      </div>

      <form
        className="grid max-w-xl gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const parsed = createMembershipInviteSchema.safeParse({
              email: fd.get("email"),
              role: fd.get("role"),
            });
            if (!parsed.success) {
              setResult({
                ok: false,
                error: parsed.error.issues[0]?.message ?? "Invalid input",
              });
              return;
            }
            const res = await api(API_ROUTES.memberships.invites, {
              method: "POST",
              body: JSON.stringify(parsed.data),
            });
            setResult(res.ok ? { ok: true } : res);
            if (!res.ok && handleAuthFailure(res)) return;
            if (res.ok) {
              e.currentTarget.reset();
              router.refresh();
            }
          });
        }}
      >
        <div>
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            required
            disabled={pending}
            placeholder="warden@hostel.example"
          />
        </div>
        <div>
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            name="role"
            defaultValue={Role.WARDEN}
            disabled={pending}
            className="h-10 rounded-md border border-(--color-border) bg-(--color-paper) px-3 text-sm"
          >
            <option value={Role.WARDEN}>{ROLE_LABELS.WARDEN}</option>
            <option value={Role.ACCOUNTANT}>{ROLE_LABELS.ACCOUNTANT}</option>
            <option value={Role.ADMIN}>{ROLE_LABELS.ADMIN}</option>
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Invite"}
        </Button>
      </form>
      {result && !result.ok ? <FieldError>{result.error}</FieldError> : null}

      <DataTable
        rows={invites}
        rowKey={(i) => i.id}
        empty={
          <EmptyState
            title="No pending invites"
            body="Invite wardens or accountants by email. Re-submitting the same email refreshes expiry."
          />
        }
        columns={[
          {
            key: "email",
            header: "Email",
            cell: (i) => i.email,
          },
          {
            key: "role",
            header: "Role",
            cell: (i) => ROLE_LABELS[i.role],
          },
          {
            key: "expires",
            header: "Expires",
            cell: (i) => i.expiresAt.slice(0, 10),
          },
          {
            key: "actions",
            header: "",
            cell: (i) => (
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    start(async () => {
                      const res = await api(API_ROUTES.memberships.invites, {
                        method: "POST",
                        body: JSON.stringify({
                          email: i.email,
                          role: i.role,
                        }),
                      });
                      if (!res.ok && handleAuthFailure(res)) return;
                      if (res.ok) router.refresh();
                      else setResult(res);
                    });
                  }}
                >
                  Resend
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    start(async () => {
                      const res = await api(
                        API_ROUTES.memberships.invite(i.id),
                        { method: "DELETE" },
                      );
                      if (!res.ok && handleAuthFailure(res)) return;
                      if (res.ok) router.refresh();
                      else setResult(res);
                    });
                  }}
                >
                  Revoke
                </Button>
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
