import { DashboardShell, requirePagePermission } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Residents" };

export default async function ResidentsPage() {
  const session = await requirePagePermission("manageResidents");

  return (
    <DashboardShell
      session={session}
      title="Residents"
      description="Profiles, guardians, and status. Search and CRUD in Week 2."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Residents" },
      ]}
      actions={<Button disabled>Add resident</Button>}
    >
      <EmptyState
        title="No residents yet"
        body="Resident records will appear here once Week 2 CRUD is live."
      />
    </DashboardShell>
  );
}
