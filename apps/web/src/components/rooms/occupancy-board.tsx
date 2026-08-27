"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BedStatus,
  type OccupancyBoardDto,
  type OccupancyBedDto,
} from "@vaikuntham/shared";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

function bedTone(status: string): StatusTone {
  if (status === BedStatus.OCCUPIED) return "occupied";
  if (status === BedStatus.VACANT) return "vacant";
  if (status === BedStatus.BLOCKED || status === BedStatus.MAINTENANCE) {
    return "blocked";
  }
  return "neutral";
}

function BedChip({ bed }: { bed: OccupancyBedDto }) {
  const label = `${bed.roomNumber}-${bed.label}`;
  const href = bed.resident
    ? `/dashboard/residents?id=${encodeURIComponent(bed.resident.id)}`
    : bed.status === BedStatus.VACANT
      ? "/dashboard/allotment"
      : "/dashboard/rooms";

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-w-20 flex-col rounded-md border border-(--color-border) px-2.5 py-2 text-left transition-colors hover:bg-(--color-surface)",
      )}
      title={
        bed.resident
          ? `${label} · ${bed.resident.fullName}`
          : `${label} · ${bed.status}`
      }
    >
      <span className="font-mono text-xs font-medium text-(--color-ink)">
        {label}
      </span>
      <StatusPill tone={bedTone(bed.status)} className="mt-1 w-fit">
        {bed.status}
      </StatusPill>
      <span className="mt-1 truncate text-xs text-(--color-muted)">
        {bed.resident?.fullName ??
          (bed.status === BedStatus.VACANT ? "Assign →" : "—")}
      </span>
    </Link>
  );
}

export function OccupancyBoard({ initial }: { initial: OccupancyBoardDto }) {
  const [vacantOnly, setVacantOnly] = useState(false);

  const blocks = useMemo(() => {
    if (!vacantOnly) return initial.blocks;
    return initial.blocks
      .map((block) => ({
        ...block,
        floors: block.floors
          .map((floor) => ({
            ...floor,
            beds: floor.beds.filter((b) => b.status === BedStatus.VACANT),
          }))
          .filter((f) => f.beds.length > 0),
      }))
      .filter((b) => b.floors.length > 0);
  }, [initial.blocks, vacantOnly]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-2xl text-(--color-ink)">
            {initial.occupancyPercent}% occupied
          </p>
          <p className="mt-1 text-sm text-(--color-muted)">
            {initial.occupiedBeds} occupied · {initial.vacantBeds} vacant ·{" "}
            {initial.totalBeds} beds
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-(--color-ink)">
          <input
            type="checkbox"
            checked={vacantOnly}
            onChange={(e) => setVacantOnly(e.target.checked)}
          />
          Vacant only
        </label>
      </div>

      {blocks.length === 0 ? (
        <p className="text-sm text-(--color-muted)">
          No beds match this filter. Add structure under Rooms & beds.
        </p>
      ) : null}

      {blocks.map((block) => (
        <section key={block.id} className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-lg text-(--color-ink)">
              {block.name}
            </h2>
            <span className="text-sm text-(--color-muted)">
              {block.occupancyPercent}% · {block.occupiedBeds}/
              {block.totalBeds}
            </span>
          </div>
          {block.floors.map((floor) => (
            <div key={floor.id} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-medium text-(--color-ink)">
                  {floor.name}
                </h3>
                <span className="text-xs text-(--color-muted)">
                  {floor.occupancyPercent}% · {floor.vacantBeds} vacant
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {floor.beds.map((bed) => (
                  <BedChip key={bed.id} bed={bed} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
