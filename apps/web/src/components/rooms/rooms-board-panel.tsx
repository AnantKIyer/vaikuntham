import Link from "next/link";
import {
  BulkRoomsForm,
  CreateBlockForm,
  CreateFloorForm,
} from "@/components/rooms/structure-forms-lazy";
import { BedsTable, type BedRow } from "@/components/rooms/beds-table-lazy";
import { StatusPill } from "@/components/ui/status-pill";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";
import { cn } from "@/lib/utils";
import {
  API_ROUTES,
  BedStatus,
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

function filterHref(
  base: { statusFilter: BedStatus | "ALL"; floorFilter: string | null },
  next: { status?: string; floor?: string | null },
) {
  const q = new URLSearchParams();
  const status = next.status ?? base.statusFilter;
  const floor =
    next.floor === undefined ? base.floorFilter : next.floor || null;
  if (status && status !== "ALL") q.set("status", status);
  if (floor) q.set("floor", floor);
  const s = q.toString();
  return s ? `/dashboard/rooms?${s}` : "/dashboard/rooms";
}

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

  const { blocks, beds: bedsRaw, totalBeds } = boardResult.data;

  const floorOptions = blocks.flatMap((b) =>
    b.floors.map((f) => ({
      id: f.id,
      label: `${b.name} · ${f.name}`,
    })),
  );

  const beds: BedRow[] = bedsRaw.map((b) => ({
    id: b.id,
    label: b.label,
    status: b.status as BedStatus,
    roomNumber: b.roomNumber,
    floorName: b.floorName,
    blockName: b.blockName,
  }));

  const filters = { statusFilter, floorFilter };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <aside className="space-y-6">
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
                  <div className="font-medium text-(--color-ink)">
                    {block.name}
                    {block.code ? (
                      <span className="ml-2 font-mono text-xs text-(--color-muted)">
                        {block.code}
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-1 space-y-1 border-l border-(--color-border) pl-3">
                    {block.floors.map((floor) => (
                      <li key={floor.id}>
                        <Link
                          href={filterHref(filters, { floor: floor.id })}
                          className={cn(
                            "text-(--color-ink-soft) hover:text-(--color-accent)",
                            floorFilter === floor.id &&
                              "font-medium text-(--color-accent)",
                          )}
                        >
                          {floor.name}
                          <span className="ml-1 text-xs text-(--color-muted)">
                            ({floor.roomCount} rooms)
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

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
            <Link
              href={filterHref(filters, { floor: null })}
              className="text-xs text-(--color-accent) hover:underline"
            >
              Clear floor filter
            </Link>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => {
            const active = statusFilter === s;
            return (
              <Link
                key={s}
                href={filterHref(filters, { status: s })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-(--color-ink) text-(--color-paper)"
                    : "bg-(--color-surface) text-(--color-ink-soft) hover:bg-(--color-surface-elevated)",
                )}
              >
                {s === "ALL" ? "All" : s}
              </Link>
            );
          })}
        </div>

        <BedsTable beds={beds} totalBeds={totalBeds} />
      </section>
    </div>
  );
}
