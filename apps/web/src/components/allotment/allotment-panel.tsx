"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  API_ROUTES,
  assignAllotmentSchema,
  transferAllotmentSchema,
  vacateResidentSchema,
  type AllotmentDto,
  type AllotmentsListDto,
  type ApiFailure,
  type BedsListDto,
  type ResidentsListDto,
} from "@vaikuntham/shared";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, Label } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { useApiClient } from "@/lib/api/client";
import { useAuthFailureHandler } from "@/lib/api/use-auth-failure-handler";

type ActionResult = { ok: true } | ApiFailure;
type Mode = "none" | "assign" | "transfer";

export function AllotmentPanel({
  initial,
  assignableResidents,
  vacantBeds,
}: {
  initial: AllotmentsListDto;
  assignableResidents: ResidentsListDto;
  vacantBeds: BedsListDto;
}) {
  const router = useRouter();
  const api = useApiClient();
  const handleAuthFailure = useAuthFailureHandler();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [mode, setMode] = useState<Mode>("none");
  const [transferTarget, setTransferTarget] = useState<AllotmentDto | null>(
    null,
  );
  const [endTarget, setEndTarget] = useState<AllotmentDto | null>(null);
  const [vacateTarget, setVacateTarget] = useState<AllotmentDto | null>(null);

  const residentOptions = assignableResidents.residents.filter(
    (r) => !r.activeAllotment && r.status !== "VACATED",
  );

  const columns = useMemo<DataTableColumn<AllotmentDto>[]>(
    () => [
      {
        key: "resident",
        header: "Resident",
        cell: (a) => a.resident.fullName,
      },
      {
        key: "bed",
        header: "Bed",
        cell: (a) =>
          `${a.bed.blockName} · ${a.bed.roomNumber}-${a.bed.label}`,
      },
      {
        key: "since",
        header: "Since",
        cell: (a) => new Date(a.startAt).toLocaleDateString(),
      },
      {
        key: "status",
        header: "Status",
        cell: () => <StatusPill tone="occupied">ACTIVE</StatusPill>,
      },
      {
        key: "actions",
        header: "",
        cell: (a) => (
          <div className="flex flex-wrap justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setTransferTarget(a);
                setMode("transfer");
                setResult(null);
              }}
            >
              Transfer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setVacateTarget(a)}
            >
              Vacate
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEndTarget(a)}
            >
              End
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-(--color-muted)">
          Transfer and vacate keep allotment history. Fees dues check arrives in
          W3.
        </p>
        <Button
          type="button"
          onClick={() => {
            setMode((m) => (m === "assign" ? "none" : "assign"));
            setTransferTarget(null);
            setResult(null);
          }}
        >
          {mode === "assign" ? "Cancel" : "Assign bed"}
        </Button>
      </div>

      {mode === "assign" ? (
        <form
          className="max-w-xl space-y-3 rounded-lg border border-(--color-border) bg-(--color-paper) p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const parsed = assignAllotmentSchema.safeParse({
                residentId: fd.get("residentId"),
                bedId: fd.get("bedId"),
                notes: fd.get("notes") || undefined,
              });
              if (!parsed.success) {
                setResult({
                  ok: false,
                  error: parsed.error.issues[0]?.message ?? "Invalid input",
                });
                return;
              }
              const res = await api(API_ROUTES.allotments.root, {
                method: "POST",
                body: JSON.stringify(parsed.data),
              });
              setResult(res.ok ? { ok: true } : res);
              if (!res.ok && handleAuthFailure(res)) return;
              if (res.ok) {
                setMode("none");
                router.refresh();
              }
            });
          }}
        >
          <div>
            <Label htmlFor="residentId">Resident</Label>
            <select
              id="residentId"
              name="residentId"
              required
              disabled={pending || residentOptions.length === 0}
              className="mt-1 h-10 w-full rounded-md border border-(--color-border) bg-(--color-paper) px-3 text-sm"
            >
              <option value="">Select resident…</option>
              {residentOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                  {r.phone ? ` · ${r.phone}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="bedId">Vacant bed</Label>
            <select
              id="bedId"
              name="bedId"
              required
              disabled={pending || vacantBeds.beds.length === 0}
              className="mt-1 h-10 w-full rounded-md border border-(--color-border) bg-(--color-paper) px-3 text-sm"
            >
              <option value="">Select bed…</option>
              {vacantBeds.beds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.blockName} · {b.roomNumber}-{b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <input
              id="notes"
              name="notes"
              disabled={pending}
              className="mt-1 h-10 w-full rounded-md border border-(--color-border) bg-(--color-paper) px-3 text-sm"
            />
          </div>
          {result && !result.ok ? <FieldError>{result.error}</FieldError> : null}
          <Button
            type="submit"
            disabled={
              pending ||
              residentOptions.length === 0 ||
              vacantBeds.beds.length === 0
            }
          >
            {pending ? "Assigning…" : "Confirm assign"}
          </Button>
        </form>
      ) : null}

      {mode === "transfer" && transferTarget ? (
        <form
          className="max-w-xl space-y-3 rounded-lg border border-(--color-border) bg-(--color-paper) p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const parsed = transferAllotmentSchema.safeParse({
                allotmentId: transferTarget.id,
                toBedId: fd.get("toBedId"),
                notes: fd.get("notes") || undefined,
              });
              if (!parsed.success) {
                setResult({
                  ok: false,
                  error: parsed.error.issues[0]?.message ?? "Invalid input",
                });
                return;
              }
              const res = await api(API_ROUTES.allotments.transfer, {
                method: "POST",
                body: JSON.stringify(parsed.data),
              });
              setResult(res.ok ? { ok: true } : res);
              if (!res.ok && handleAuthFailure(res)) return;
              if (res.ok) {
                setMode("none");
                setTransferTarget(null);
                router.refresh();
              }
            });
          }}
        >
          <p className="text-sm text-(--color-ink)">
            Transfer <strong>{transferTarget.resident.fullName}</strong> from{" "}
            {transferTarget.bed.roomNumber}-{transferTarget.bed.label}
          </p>
          <div>
            <Label htmlFor="toBedId">New vacant bed</Label>
            <select
              id="toBedId"
              name="toBedId"
              required
              disabled={pending || vacantBeds.beds.length === 0}
              className="mt-1 h-10 w-full rounded-md border border-(--color-border) bg-(--color-paper) px-3 text-sm"
            >
              <option value="">Select bed…</option>
              {vacantBeds.beds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.blockName} · {b.roomNumber}-{b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="transfer-notes">Notes (optional)</Label>
            <input
              id="transfer-notes"
              name="notes"
              disabled={pending}
              className="mt-1 h-10 w-full rounded-md border border-(--color-border) bg-(--color-paper) px-3 text-sm"
            />
          </div>
          {result && !result.ok ? <FieldError>{result.error}</FieldError> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || vacantBeds.beds.length === 0}>
              {pending ? "Transferring…" : "Confirm transfer"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMode("none");
                setTransferTarget(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <DataTable
        columns={columns}
        rows={initial.allotments}
        rowKey={(a) => a.id}
        empty={
          <EmptyState
            title="No active allotments"
            body="Assign a resident to a vacant bed to start occupancy history."
            action={
              <Button type="button" onClick={() => setMode("assign")}>
                Assign bed
              </Button>
            }
          />
        }
      />

      <ConfirmDialog
        open={Boolean(endTarget)}
        title="End allotment?"
        description={
          endTarget
            ? `End ${endTarget.resident.fullName}'s stay in ${endTarget.bed.roomNumber}-${endTarget.bed.label}. The bed becomes vacant; resident stays ACTIVE.`
            : ""
        }
        confirmLabel="End allotment"
        onCancel={() => setEndTarget(null)}
        onConfirm={() => {
          if (!endTarget) return;
          start(async () => {
            const res = await api(API_ROUTES.allotments.end(endTarget.id), {
              method: "POST",
              body: JSON.stringify({}),
            });
            if (!res.ok && handleAuthFailure(res)) return;
            setEndTarget(null);
            if (res.ok) router.refresh();
            else setResult(res);
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(vacateTarget)}
        title="Vacate resident?"
        description={
          vacateTarget
            ? `Vacate ${vacateTarget.resident.fullName}: end their bed stay and set status to VACATED. Open dues (when fees ship) will require acknowledgement.`
            : ""
        }
        confirmLabel="Vacate"
        onCancel={() => setVacateTarget(null)}
        onConfirm={() => {
          if (!vacateTarget) return;
          start(async () => {
            const parsed = vacateResidentSchema.safeParse({
              residentId: vacateTarget.resident.id,
              acknowledgeDues: true,
            });
            if (!parsed.success) return;
            const res = await api(API_ROUTES.allotments.vacate, {
              method: "POST",
              body: JSON.stringify(parsed.data),
            });
            if (!res.ok && handleAuthFailure(res)) return;
            setVacateTarget(null);
            if (res.ok) router.refresh();
            else setResult(res);
          });
        }}
      />
    </div>
  );
}
