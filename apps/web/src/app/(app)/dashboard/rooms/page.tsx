import { Suspense } from "react";
import {
  DashboardShell,
  ensurePagePermission,
  loadDashboardSession,
} from "@/components/layout/dashboard-shell";
import { RoomsBoardPanel } from "@/components/rooms/rooms-board-panel";
import { RoomsContentSkeleton } from "@/components/ui/page-skeletons";
import { BedStatus } from "@vaikuntham/shared";

export const metadata = { title: "Rooms & beds" };

const STATUS_FILTERS: Array<BedStatus | "ALL"> = [
  "ALL",
  BedStatus.VACANT,
  BedStatus.OCCUPIED,
  BedStatus.BLOCKED,
  BedStatus.MAINTENANCE,
];

type SearchParams = Promise<{ status?: string; floor?: string }>;

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const statusFilter =
    params.status &&
    STATUS_FILTERS.includes(params.status as BedStatus | "ALL")
      ? (params.status as BedStatus | "ALL")
      : "ALL";
  const floorFilter = params.floor?.trim() || null;

  const session = await loadDashboardSession();
  ensurePagePermission(session, "manageStructure");

  return (
    <DashboardShell
      title="Rooms & beds"
      description="Define hostel structure, bulk-create rooms, and manage bed status."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Rooms & beds" },
      ]}
    >
      <Suspense fallback={<RoomsContentSkeleton />}>
        <RoomsBoardPanel
          statusFilter={statusFilter}
          floorFilter={floorFilter}
        />
      </Suspense>
    </DashboardShell>
  );
}
