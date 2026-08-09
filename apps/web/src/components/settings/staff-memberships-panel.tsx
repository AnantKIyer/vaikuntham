"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  API_ROUTES,
  ROLE_LABELS,
  Role,
  type MembershipDto,
} from "@vaikuntham/shared";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field";
import { useApiClient } from "@/lib/api/client";
import { useAuthFailureHandler } from "@/lib/api/use-auth-failure-handler";

export function StaffMembershipsPanel({
  members,
  currentUserId,
}: {
  members: MembershipDto[];
  currentUserId: string;
}) {
  const router = useRouter();
  const api = useApiClient();
  const handleAuthFailure = useAuthFailureHandler();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const adminCount = members.filter((m) => m.role === Role.ADMIN).length;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-lg text-(--color-ink)">
          Staff memberships
        </h2>
      </div>
      <p className="mb-4 text-sm text-(--color-muted)">
        Owner and admins manage roles here. Staff join via email invite — there
        is no self-serve access request in this release.
      </p>
      {error ? <FieldError>{error}</FieldError> : null}
      <DataTable
        rows={members}
        rowKey={(m) => m.id}
        empty={
          <EmptyState
            title="No members yet"
            body="The first user in your Clerk organization becomes admin. Invite additional staff below."
          />
        }
        columns={[
          {
            key: "user",
            header: "Clerk user",
            cell: (m) => (
              <span className="font-mono text-xs">
                {m.clerkUserId}
                {m.clerkUserId === currentUserId ? " (you)" : ""}
              </span>
            ),
          },
          {
            key: "role",
            header: "Role",
            cell: (m) => (
              <select
                value={m.role}
                disabled={
                  pending ||
                  (m.role === Role.ADMIN &&
                    adminCount <= 1 &&
                    m.clerkUserId === currentUserId)
                }
                className="h-8 rounded-md border border-(--color-border) bg-(--color-paper) px-2 text-sm"
                onChange={(e) => {
                  const role = e.target.value as Role;
                  if (role === m.role) return;
                  start(async () => {
                    setError(null);
                    const res = await api(API_ROUTES.memberships.member(m.id), {
                      method: "PATCH",
                      body: JSON.stringify({ role }),
                    });
                    if (!res.ok && handleAuthFailure(res)) return;
                    if (!res.ok) {
                      setError(res.error);
                      e.target.value = m.role;
                      return;
                    }
                    router.refresh();
                  });
                }}
              >
                <option value={Role.ADMIN}>{ROLE_LABELS.ADMIN}</option>
                <option value={Role.WARDEN}>{ROLE_LABELS.WARDEN}</option>
                <option value={Role.ACCOUNTANT}>
                  {ROLE_LABELS.ACCOUNTANT}
                </option>
              </select>
            ),
          },
          {
            key: "joined",
            header: "Joined",
            cell: (m) => m.createdAt.slice(0, 10),
          },
          {
            key: "actions",
            header: "",
            cell: (m) => {
              const isSelf = m.clerkUserId === currentUserId;
              const isLastAdmin = m.role === Role.ADMIN && adminCount <= 1;
              if (isSelf || isLastAdmin) return null;
              return (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Remove ${m.clerkUserId} from this hostel?`,
                        )
                      ) {
                        return;
                      }
                      start(async () => {
                        setError(null);
                        const res = await api(
                          API_ROUTES.memberships.member(m.id),
                          { method: "DELETE" },
                        );
                        if (!res.ok && handleAuthFailure(res)) return;
                        if (!res.ok) setError(res.error);
                        else router.refresh();
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              );
            },
          },
        ]}
      />
    </section>
  );
}
