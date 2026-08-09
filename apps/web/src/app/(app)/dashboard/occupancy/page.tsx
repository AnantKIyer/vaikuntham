import { API_ROUTES, type OccupancyBoardDto } from "@vaikuntham/shared";
import {
  DashboardShell,
  ensurePagePermission,
  loadDashboardSession,
} from "@/components/layout/dashboard-shell";
import { OccupancyBoard } from "@/components/rooms/occupancy-board";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";

export const metadata = { title: "Occupancy" };

export default async function OccupancyPage() {
  const session = await loadDashboardSession();
  ensurePagePermission(session, "viewStructure");

  const result = await apiFetch<OccupancyBoardDto>(
    API_ROUTES.structure.occupancy,
  );
  redirectOnApiAuthFailure(result);
  if (!result.ok) throw new Error(result.error);

  return (
    <DashboardShell
      session={session}
      title="Occupancy"
      description="Beds by block and floor — click a vacant bed to assign."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { href: "/dashboard/rooms", label: "Rooms" },
        { label: "Occupancy" },
      ]}
    >
      <OccupancyBoard initial={result.data} />
    </DashboardShell>
  );
}
