"use client";

import { BedStatus } from "@vaikuntham/shared";
import { useEffect, useState, useTransition } from "react";
import { API_ROUTES } from "@vaikuntham/shared";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { useApiClient } from "@/lib/api/client";
import { useAuthFailureHandler } from "@/lib/api/use-auth-failure-handler";

const STATUS_TONE: Record<BedStatus, StatusTone> = {
  VACANT: "vacant",
  OCCUPIED: "occupied",
  BLOCKED: "blocked",
  MAINTENANCE: "partial",
};

const MANUAL_STATUSES: BedStatus[] = [
  BedStatus.VACANT,
  BedStatus.BLOCKED,
  BedStatus.MAINTENANCE,
];

export type BedRow = {
  id: string;
  label: string;
  status: BedStatus;
  roomNumber: string;
  floorName: string;
  blockName: string;
};

export function BedStatusSelect({ bed }: { bed: BedRow }) {
  const api = useApiClient();
  const handleAuthFailure = useAuthFailureHandler();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState(bed.status);
  const [error, setError] = useState<string | null>(null);
  const locked = status === BedStatus.OCCUPIED;

  useEffect(() => {
    setStatus(bed.status);
  }, [bed.status]);

  return (
    <div className="flex items-center gap-2">
      <StatusPill tone={STATUS_TONE[status]}>{status}</StatusPill>
      {error ? (
        <span className="text-xs text-(--status-blocked)">{error}</span>
      ) : null}
      {locked ? (
        <span className="text-xs text-(--color-muted)">via allotment</span>
      ) : (
        <select
          aria-label={`Status for bed ${bed.label}`}
          className="h-8 rounded-md border border-(--color-border) bg-(--color-paper) px-2 text-xs"
          disabled={pending}
          value={status}
          onChange={(e) => {
            const next = e.target.value as BedStatus;
            const prev = status;
            setError(null);
            setStatus(next);
            start(async () => {
              const res = await api(API_ROUTES.structure.bedStatus(bed.id), {
                method: "PATCH",
                body: JSON.stringify({ status: next }),
              });
              if (!res.ok) {
                if (handleAuthFailure(res)) return;
                setStatus(prev);
                setError(res.error);
              }
            });
          }}
        >
          {MANUAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export { STATUS_TONE };
