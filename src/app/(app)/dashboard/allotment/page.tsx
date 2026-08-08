import { DashboardShell, requirePagePermission } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Allotment" };

export default async function AllotmentPage() {
  const session = await requirePagePermission("manageAllotment");

  return (
    <DashboardShell
      session={session}
      title="Allotment"
      description="Assign, transfer, and vacate with SQL transactions. Week 2."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Allotment" },
      ]}
      actions={<Button disabled>Assign bed</Button>}
    >
      <EmptyState
        title="Allotment wizard coming next"
        body="One active allotment per bed and per resident — enforced in Postgres."
      />
    </DashboardShell>
  );
}
