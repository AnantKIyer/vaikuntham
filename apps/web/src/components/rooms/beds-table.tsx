"use client";

import { useState } from "react";
import {
  BedStatusSelect,
  type BedRow,
} from "@/components/rooms/bed-status-select";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { BedStatus } from "@vaikuntham/shared";

export function BedsTable({
  beds,
  totalBeds,
  selectedIds,
  onSelectionChange,
  onRename,
  onDelete,
}: {
  beds: BedRow[];
  totalBeds: number;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onRename: (bed: BedRow, label: string) => Promise<void>;
  onDelete: (bed: BedRow) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const allSelected = beds.length > 0 && beds.every((b) => selectedIds.has(b.id));

  function toggleAll() {
    if (allSelected) {
      onSelectionChange(new Set());
      return;
    }
    onSelectionChange(new Set(beds.map((b) => b.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  async function saveRename(bed: BedRow) {
    const label = editLabel.trim();
    if (!label || label === bed.label) {
      setEditingId(null);
      return;
    }
    setBusyId(bed.id);
    try {
      await onRename(bed, label);
      setEditingId(null);
    } finally {
      setBusyId(null);
    }
  }

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
          key: "select",
          header: (
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              aria-label="Select all beds"
            />
          ),
          className: "w-10",
          cell: (b) => (
            <input
              type="checkbox"
              checked={selectedIds.has(b.id)}
              onChange={() => toggleOne(b.id)}
              aria-label={`Select bed ${b.label}`}
            />
          ),
        },
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
          cell: (b) =>
            editingId === b.id ? (
              <input
                className="w-16 rounded border border-(--color-border) bg-(--color-paper) px-2 py-1 font-mono text-xs"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveRename(b);
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
              />
            ) : (
              <span className="font-mono text-xs">{b.label}</span>
            ),
        },
        {
          key: "status",
          header: "Status",
          cell: (b) => <BedStatusSelect bed={b} />,
        },
        {
          key: "actions",
          header: "",
          className: "text-right",
          cell: (b) => (
            <div className="flex justify-end gap-2">
              {editingId === b.id ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === b.id}
                    onClick={() => void saveRename(b)}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="text-xs text-(--color-accent) hover:underline disabled:opacity-40"
                    disabled={
                      b.status === BedStatus.OCCUPIED || busyId === b.id
                    }
                    onClick={() => {
                      setEditingId(b.id);
                      setEditLabel(b.label);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "text-xs hover:underline",
                      b.status === BedStatus.OCCUPIED
                        ? "cursor-not-allowed text-(--color-muted)"
                        : "text-(--status-blocked)",
                    )}
                    disabled={
                      b.status === BedStatus.OCCUPIED || busyId === b.id
                    }
                    onClick={() => void onDelete(b)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}

export type { BedRow };
