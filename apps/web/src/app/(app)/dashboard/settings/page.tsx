import { Suspense } from "react";
import {
  DashboardShell,
  ensurePagePermission,
  loadDashboardSession,
} from "@/components/layout/dashboard-shell";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { SettingsContentSkeleton } from "@/components/ui/page-skeletons";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await loadDashboardSession();
  ensurePagePermission(session, "manageHostel");

  return (
    <DashboardShell
      title="Settings"
      description="Hostel profile, staff memberships, and environment status."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Settings" },
      ]}
    >
      <Suspense fallback={<SettingsContentSkeleton />}>
        <SettingsPanel />
      </Suspense>
    </DashboardShell>
  );
}
