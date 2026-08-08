import { DashboardShell, requirePagePermission } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Fees" };

export default async function FeesPage() {
  const session = await requirePagePermission("managePayments");

  return (
    <DashboardShell
      session={session}
      title="Fees"
      description="Fee plans, invoices, payments, and dues. Week 3."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Fees" },
      ]}
      actions={<Button disabled>Create invoice</Button>}
    >
      <EmptyState
        title="Billing module not started"
        body="Amounts will be stored as integer paise. Manual payment recording for the Aug demo."
      />
    </DashboardShell>
  );
}
