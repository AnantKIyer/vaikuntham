import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell, loadDashboardSession } from "@/components/layout/dashboard-shell";
import { DashboardStatsPanel } from "@/components/dashboard/dashboard-stats-panel";
import { Button } from "@/components/ui/button";
import { DashboardContentSkeleton } from "@/components/ui/page-skeletons";
import { can } from "@vaikuntham/shared";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await loadDashboardSession();
  const canAllot = can(session.role, "manageAllotment");

  return (
    <DashboardShell
      title="Dashboard"
      description="Occupancy snapshot for your hostel. Full collections KPIs land in Week 3."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Dashboard" },
      ]}
      actions={
        canAllot ? (
          <Link href="/dashboard/allotment">
            <Button>Assign bed</Button>
          </Link>
        ) : undefined
      }
    >
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardStatsPanel />
      </Suspense>
    </DashboardShell>
  );
}
