import { format } from "date-fns";
import {
  DashboardShell,
  requirePagePermission,
} from "@/components/layout/dashboard-shell";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const session = await requirePagePermission("viewAudit");

  const logs = await prisma.auditLog.findMany({
    where: { hostelId: session.hostelId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <DashboardShell
      session={session}
      title="Audit log"
      description="Immutable trail of sensitive membership and (later) allotment/payment actions."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Audit log" },
      ]}
    >
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
              <span className="font-medium text-(--color-ink)">
                {row.action}
              </span>
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
    </DashboardShell>
  );
}
