import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";
import {
  API_ROUTES,
  type AuditLogDto,
  type PageWithSession,
} from "@vaikuntham/shared";

export async function AuditLogPanel() {
  const result = await apiFetch<PageWithSession<{ logs: AuditLogDto[] }>>(
    API_ROUTES.audit,
  );
  redirectOnApiAuthFailure(result);
  if (!result.ok) throw new Error(result.error);

  const { logs: rawLogs } = result.data;

  const logs = rawLogs.map((row) => ({
    ...row,
    createdAt: new Date(row.createdAt),
  }));

  return (
    <DataTable
      rows={logs}
      rowKey={(row) => row.id}
      empty={
        <EmptyState
          title="No audit events yet"
          body="Events appear when staff join, and when allotment/payment mutations land in later weeks."
        />
      }
      columns={[
        {
          key: "when",
          header: "When",
          cell: (row) => format(row.createdAt, "dd MMM yyyy HH:mm"),
        },
        {
          key: "action",
          header: "Action",
          cell: (row) => (
            <span className="font-medium text-(--color-ink)">{row.action}</span>
          ),
        },
        {
          key: "entity",
          header: "Entity",
          cell: (row) => `${row.entityType} · ${row.entityId.slice(0, 8)}…`,
        },
        {
          key: "actor",
          header: "Actor",
          cell: (row) => (
            <span className="font-mono text-xs">
              {row.actorId.slice(0, 12)}…
            </span>
          ),
        },
      ]}
    />
  );
}
