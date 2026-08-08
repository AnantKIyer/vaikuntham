"use client";

import {
  BedStatusSelect,
  type BedRow,
} from "@/components/rooms/bed-status-select";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";

export function BedsTable({
  beds,
  totalBeds,
}: {
  beds: BedRow[];
  totalBeds: number;
}) {
  return (
    <DataTable
      rows={beds}
      rowKey={(b) => b.id}
      empty={
        <EmptyState
          title={totalBeds === 0 ? "No beds yet" : "No beds match"}
          body={
            totalBeds === 0
              ? "Add a block, then bulk-create rooms with beds."
              : "Try another status or clear the floor filter."
          }
        />
      }
      columns={[
        {
          key: "location",
          header: "Location",
          cell: (b) => (
            <span>
              {b.blockName} · {b.floorName}
            </span>
          ),
        },
        {
          key: "room",
          header: "Room",
          cell: (b) => (
            <span className="font-mono text-xs">{b.roomNumber}</span>
          ),
        },
        {
          key: "bed",
          header: "Bed",
          cell: (b) => <span className="font-mono text-xs">{b.label}</span>,
        },
        {
          key: "status",
          header: "Status",
          cell: (b) => <BedStatusSelect bed={b} />,
        },
      ]}
    />
  );
}

export type { BedRow };
