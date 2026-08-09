import { RoomsBoardClient } from "@/components/rooms/rooms-board-client";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";
import {
  API_ROUTES,
  BedStatus,
  type PageWithSession,
  type RoomsBoardDto,
} from "@vaikuntham/shared";

export async function RoomsBoardPanel({
  statusFilter,
  floorFilter,
}: {
  statusFilter: BedStatus | "ALL";
  floorFilter: string | null;
}) {
  const boardQuery = new URLSearchParams({
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(floorFilter ? { floor: floorFilter } : {}),
  }).toString();

  const boardResult = await apiFetch<PageWithSession<RoomsBoardDto>>(
    `${API_ROUTES.structure.board}${boardQuery ? `?${boardQuery}` : ""}`,
  );
  redirectOnApiAuthFailure(boardResult);
  if (!boardResult.ok) throw new Error(boardResult.error);

  return (
    <RoomsBoardClient
      initialStatusFilter={statusFilter}
      initialFloorFilter={floorFilter}
      initialBoard={boardResult.data}
    />
  );
}
