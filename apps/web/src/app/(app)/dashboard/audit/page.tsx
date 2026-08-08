import { Suspense } from "react";
import {
  DashboardShell,
  ensurePagePermission,
  loadDashboardSession,
} from "@/components/layout/dashboard-shell";
import { AuditLogPanel } from "@/components/audit/audit-log-panel";
import { TableSkeleton } from "@/components/ui/page-skeletons";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const session = await loadDashboardSession();
  ensurePagePermission(session, "viewAudit");

  return (
    <DashboardShell
      title="Audit log"
      description="Immutable trail of sensitive membership and (later) allotment/payment actions."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Audit log" },
      ]}
    >
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <AuditLogPanel />
      </Suspense>
    </DashboardShell>
  );
}
