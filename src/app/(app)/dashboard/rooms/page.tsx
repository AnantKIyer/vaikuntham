import { DashboardShell, requirePagePermission } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Rooms & beds" };

export default async function RoomsPage() {
  const session = await requirePagePermission("manageStructure");

  return (
    <DashboardShell
      session={session}
      title="Rooms & beds"
      description="Blocks, floors, rooms, and bed status. CRUD ships in Week 2."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Rooms & beds" },
      ]}
      actions={<Button disabled>Add block</Button>}
    >
      <EmptyState
        title="No structure yet"
        body="Create blocks and bulk-generate rooms with beds in Week 2."
      />
    </DashboardShell>
  );
}
