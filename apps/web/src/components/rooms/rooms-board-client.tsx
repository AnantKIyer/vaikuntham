"use client";

import { useEffect, useState, useTransition } from "react";
import {
  BulkRoomsForm,
  CreateBlockForm,
  CreateFloorForm,
} from "@/components/rooms/structure-forms-lazy";
import { BedsTable, type BedRow } from "@/components/rooms/beds-table-lazy";
import { StatusPill } from "@/components/ui/status-pill";
import { TableSkeleton } from "@/components/ui/page-skeletons";
import { useApiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  API_ROUTES,
  BedStatus,
  type BlockTree,
  type PageWithSession,
  type RoomsBoardDto,
} from "@vaikuntham/shared";

const STATUS_FILTERS: Array<BedStatus | "ALL"> = [
  "ALL",
  BedStatus.VACANT,
  BedStatus.OCCUPIED,
  BedStatus.BLOCKED,
  BedStatus.MAINTENANCE,
];

function syncRoomsUrl(
  statusFilter: BedStatus | "ALL",
  floorFilter: string | null,
) {
  const q = new URLSearchParams();
  if (statusFilter !== "ALL") q.set("status", statusFilter);
  if (floorFilter) q.set("floor", floorFilter);
  const next = q.toString()
    ? `/dashboard/rooms?${q.toString()}`
    : "/dashboard/rooms";
  window.history.replaceState(null, "", next);
}

function toBedRows(beds: RoomsBoardDto["beds"]): BedRow[] {
  return beds.map((b) => ({
    id: b.id,
    label: b.label,
    status: b.status as BedStatus,
    roomNumber: b.roomNumber,
    floorName: b.floorName,
    blockName: b.blockName,
  }));
}

export function RoomsBoardClient({
  initialStatusFilter,
  initialFloorFilter,
  initialBoard,
}: {
  initialStatusFilter: BedStatus | "ALL";
  initialFloorFilter: string | null;
  initialBoard: RoomsBoardDto;
}) {
  const api = useApiClient();
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [floorFilter, setFloorFilter] = useState(initialFloorFilter);
  const [blocks, setBlocks] = useState(initialBoard.blocks);
  const [beds, setBeds] = useState(() => toBedRows(initialBoard.beds));
  const [totalBeds, setTotalBeds] = useState(initialBoard.totalBeds);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();

  // After structure mutations call router.refresh(), sync server payload.
  useEffect(() => {
    setStatusFilter(initialStatusFilter);
    setFloorFilter(initialFloorFilter);
    setBlocks(initialBoard.blocks);
    setBeds(toBedRows(initialBoard.beds));
    setTotalBeds(initialBoard.totalBeds);
  }, [initialBoard, initialStatusFilter, initialFloorFilter]);

  const floorOptions = blocks.flatMap((b) =>
    b.floors.map((f) => ({
      id: f.id,
      label: `${b.name} · ${f.name}`,
    })),
  );

  async function applyFilters(
    nextStatus: BedStatus | "ALL",
    nextFloor: string | null,
  ) {
    if (nextStatus === statusFilter && nextFloor === floorFilter) return;

    setStatusFilter(nextStatus);
    setFloorFilter(nextFloor);
    syncRoomsUrl(nextStatus, nextFloor);
    setTableLoading(true);
    setError(null);

    const q = new URLSearchParams({
      ...(nextStatus !== "ALL" ? { status: nextStatus } : {}),
      ...(nextFloor ? { floor: nextFloor } : {}),
    }).toString();

    const result = await api<PageWithSession<RoomsBoardDto>>(
      `${API_ROUTES.structure.board}${q ? `?${q}` : ""}`,
    );

    if (!result.ok) {
      setError(result.error);
      setTableLoading(false);
      return;
    }

    startTransition(() => {
      setBlocks(result.data.blocks);
      setBeds(toBedRows(result.data.beds));
      setTotalBeds(result.data.totalBeds);
      setSelectedIds(new Set());
      setTableLoading(false);
    });
  }

  async function refreshBoard() {
    const q = new URLSearchParams({
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      ...(floorFilter ? { floor: floorFilter } : {}),
    }).toString();

    const result = await api<PageWithSession<RoomsBoardDto>>(
      `${API_ROUTES.structure.board}${q ? `?${q}` : ""}`,
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBlocks(result.data.blocks);
    setBeds(toBedRows(result.data.beds));
    setTotalBeds(result.data.totalBeds);
    setSelectedIds(new Set());
  }

  async function renameBed(bed: BedRow, label: string) {
    setError(null);
    const result = await api(API_ROUTES.structure.bed(bed.id), {
      method: "PATCH",
      body: JSON.stringify({ label }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await refreshBoard();
  }

  async function deleteBed(bed: BedRow) {
    const label = `${bed.blockName} · ${bed.floorName} · ${bed.roomNumber} · ${bed.label}`;
    if (!window.confirm(`Delete bed ${label}? This cannot be undone.`)) return;

    setError(null);
    const result = await api(API_ROUTES.structure.bed(bed.id), {
      method: "DELETE",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await refreshBoard();
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      !window.confirm(`Delete ${ids.length} bed(s)? This cannot be undone.`)
    ) {
      return;
    }

    setError(null);
    setTableLoading(true);
    const result = await api(API_ROUTES.structure.bedsDelete, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    if (!result.ok) {
      setError(result.error);
      setTableLoading(false);
      return;
    }
    await refreshBoard();
    setTableLoading(false);
  }

  async function bulkRenameSequential() {
    const selected = beds.filter((b) => selectedIds.has(b.id));
    if (selected.length === 0) return;

    const start = window.prompt(
      "Starting label (single letter, e.g. A)?",
      "A",
    );
    if (!start) return;
    const base = start.trim().charCodeAt(0);

    const items = selected.map((bed, i) => ({
      id: bed.id,
      label: String.fromCharCode(base + i),
    }));

    setError(null);
    setTableLoading(true);
    const result = await api(API_ROUTES.structure.bedsRename, {
      method: "POST",
      body: JSON.stringify({ items }),
    });
    if (!result.ok) {
      setError(result.error);
      setTableLoading(false);
      return;
    }
    await refreshBoard();
    setTableLoading(false);
  }

  async function renameBlock(blockId: string, name: string) {
    const result = await api(API_ROUTES.structure.block(blockId), {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await refreshBoard();
  }

  async function renameFloor(floorId: string, name: string) {
    const result = await api(API_ROUTES.structure.floor(floorId), {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await refreshBoard();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <aside className="space-y-6">
        <StructureTree
          blocks={blocks}
          floorFilter={floorFilter}
          onFloorSelect={(floorId) => void applyFilters(statusFilter, floorId)}
          onRenameBlock={(blockId, name) => void renameBlock(blockId, name)}
          onRenameFloor={(floorId, name) => void renameFloor(floorId, name)}
        />

        <section className="rounded-lg border border-(--color-border) bg-(--color-paper) p-5">
          <h2 className="font-display text-lg text-(--color-ink)">Add block</h2>
          <div className="mt-3">
            <CreateBlockForm />
          </div>
        </section>

        {blocks.length > 0 ? (
          <section className="rounded-lg border border-(--color-border) bg-(--color-paper) p-5">
            <h2 className="font-display text-lg text-(--color-ink)">Add floor</h2>
            <div className="mt-3">
              <CreateFloorForm
                blocks={blocks.map((b) => ({ id: b.id, name: b.name }))}
              />
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-(--color-border) bg-(--color-paper) p-5">
          <h2 className="font-display text-lg text-(--color-ink)">Bulk rooms</h2>
          <p className="mt-1 text-xs text-(--color-muted)">
            Creates N rooms with M beds each (labels A, B, …).
          </p>
          <div className="mt-3">
            <BulkRoomsForm floors={floorOptions} />
          </div>
        </section>
      </aside>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg text-(--color-ink)">Beds</h2>
          <StatusPill tone="neutral">
            {beds.length}
            {statusFilter !== "ALL" || floorFilter ? ` of ${totalBeds}` : ""}
          </StatusPill>
          {floorFilter ? (
            <button
              type="button"
              onClick={() => void applyFilters(statusFilter, null)}
              className="text-xs text-(--color-accent) hover:underline"
            >
              Clear floor filter
            </button>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => void applyFilters(s, floorFilter)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-(--color-ink) text-(--color-paper)"
                    : "bg-(--color-surface) text-(--color-ink-soft) hover:bg-(--color-surface-elevated)",
                )}
              >
                {s === "ALL" ? "All" : s}
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mb-3 text-sm text-(--status-blocked)">{error}</p>
        ) : null}

        {selectedIds.size > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2">
            <span className="text-xs text-(--color-muted)">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              className="text-xs font-medium text-(--color-accent) hover:underline"
              onClick={() => void bulkRenameSequential()}
            >
              Rename A,B,C…
            </button>
            <button
              type="button"
              className="text-xs font-medium text-(--status-blocked) hover:underline"
              onClick={() => void bulkDelete()}
            >
              Delete
            </button>
            <button
              type="button"
              className="text-xs text-(--color-muted) hover:underline"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        ) : null}

        {tableLoading ? (
          <TableSkeleton rows={6} />
        ) : (
          <BedsTable
            beds={beds}
            totalBeds={totalBeds}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRename={renameBed}
            onDelete={deleteBed}
          />
        )}
      </section>
    </div>
  );
}

function StructureTree({
  blocks,
  floorFilter,
  onFloorSelect,
  onRenameBlock,
  onRenameFloor,
}: {
  blocks: BlockTree[];
  floorFilter: string | null;
  onFloorSelect: (floorId: string) => void;
  onRenameBlock: (blockId: string, name: string) => void;
  onRenameFloor: (floorId: string, name: string) => void;
}) {
  return (
    <section className="rounded-lg border border-(--color-border) bg-(--color-paper) p-5">
      <h2 className="font-display text-lg text-(--color-ink)">Structure</h2>
      {blocks.length === 0 ? (
        <p className="mt-2 text-sm text-(--color-muted)">
          No blocks yet — add the first one below.
        </p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm">
          {blocks.map((block) => (
            <li key={block.id}>
              <div className="flex items-center gap-2 font-medium text-(--color-ink)">
                <span>{block.name}</span>
                {block.code ? (
                  <span className="font-mono text-xs text-(--color-muted)">
                    {block.code}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="text-xs font-normal text-(--color-accent) hover:underline"
                  onClick={() => {
                    const next = window.prompt("Block name", block.name);
                    if (next?.trim()) onRenameBlock(block.id, next.trim());
                  }}
                >
                  Rename
                </button>
              </div>
              <ul className="mt-1 space-y-1 border-l border-(--color-border) pl-3">
                {block.floors.map((floor) => (
                  <li key={floor.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onFloorSelect(floor.id)}
                      className={cn(
                        "text-left text-(--color-ink-soft) hover:text-(--color-accent)",
                        floorFilter === floor.id &&
                          "font-medium text-(--color-accent)",
                      )}
                    >
                      {floor.name}
                      <span className="ml-1 text-xs text-(--color-muted)">
                        ({floor.roomCount} rooms)
                      </span>
                    </button>
                    <button
                      type="button"
                      className="text-xs text-(--color-accent) hover:underline"
                      onClick={() => {
                        const next = window.prompt("Floor name", floor.name);
                        if (next?.trim()) onRenameFloor(floor.id, next.trim());
                      }}
                    >
                      Rename
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
