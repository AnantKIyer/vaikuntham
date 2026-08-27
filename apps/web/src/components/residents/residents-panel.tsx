"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  API_ROUTES,
  createResidentSchema,
  ResidentStatus,
  type AllotmentDto,
  type AllotmentsListDto,
  type ApiFailure,
  type ResidentDto,
  type ResidentsListDto,
} from "@vaikuntham/shared";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, Input, Label } from "@/components/ui/field";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { useApiClient } from "@/lib/api/client";
import { useAuthFailureHandler } from "@/lib/api/use-auth-failure-handler";

function statusTone(status: string): StatusTone {
  if (status === ResidentStatus.ACTIVE) return "occupied";
  if (status === ResidentStatus.VACATED) return "blocked";
  return "partial";
}

type ActionResult = { ok: true } | ApiFailure;

export function ResidentsPanel({
  initial,
  initialQ,
  initialStatus,
  focusResident = null,
}: {
  initial: ResidentsListDto;
  initialQ: string;
  initialStatus: string;
  focusResident?: ResidentDto | null;
}) {
  const router = useRouter();
  const api = useApiClient();
  const handleAuthFailure = useAuthFailureHandler();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [historyFor, setHistoryFor] = useState<ResidentDto | null>(null);
  const [history, setHistory] = useState<AllotmentDto[] | null>(null);

  useEffect(() => {
    if (!focusResident) return;
    let cancelled = false;
    start(async () => {
      const res = await api<AllotmentsListDto>(
        API_ROUTES.residents.history(focusResident.id),
      );
      if (cancelled) return;
      if (!res.ok && handleAuthFailure(res)) return;
      if (res.ok) {
        setHistoryFor(focusResident);
        setHistory(res.data.allotments);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [api, focusResident, handleAuthFailure]);

  const columns = useMemo<DataTableColumn<ResidentDto>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        cell: (r) => (
          <div>
            <div className="font-medium text-(--color-ink)">{r.fullName}</div>
            {r.phone ? (
              <div className="text-xs text-(--color-muted)">{r.phone}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (r) => (
          <StatusPill tone={statusTone(r.status)}>{r.status}</StatusPill>
        ),
      },
      {
        key: "bed",
        header: "Bed",
        cell: (r) =>
          r.activeAllotment
            ? `${r.activeAllotment.blockName} · ${r.activeAllotment.roomNumber}-${r.activeAllotment.bedLabel}`
            : "—",
      },
      {
        key: "guardian",
        header: "Guardian",
        cell: (r) => r.guardianName ?? "—",
      },
      {
        key: "id",
        header: "ID",
        cell: (r) =>
          r.idNumber ? `${r.idType ?? "ID"} ${r.idNumber}` : "—",
      },
      {
        key: "history",
        header: "",
        cell: (r) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              start(async () => {
                const res = await api<AllotmentsListDto>(
                  API_ROUTES.residents.history(r.id),
                );
                if (!res.ok && handleAuthFailure(res)) return;
                if (res.ok) {
                  setHistoryFor(r);
                  setHistory(res.data.allotments);
                }
              });
            }}
          >
            History
          </Button>
        ),
      },
    ],
    [api, handleAuthFailure],
  );

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const q = String(fd.get("q") ?? "").trim();
          const status = String(fd.get("status") ?? "ALL");
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (status !== "ALL") params.set("status", status);
          const qs = params.toString();
          router.push(qs ? `/dashboard/residents?${qs}` : "/dashboard/residents");
        }}
      >
        <div className="min-w-48 flex-1">
          <Label htmlFor="resident-q">Search</Label>
          <Input
            id="resident-q"
            name="q"
            defaultValue={initialQ}
            placeholder="Name, phone, email, or ID number"
          />
        </div>
        <div>
          <Label htmlFor="resident-status">Status</Label>
          <select
            id="resident-status"
            name="status"
            defaultValue={initialStatus}
            className="h-10 rounded-md border border-(--color-border) bg-(--color-paper) px-3 text-sm"
          >
            <option value="ALL">All</option>
            <option value="APPLICANT">Applicant</option>
            <option value="ACTIVE">Active</option>
            <option value="VACATED">Vacated</option>
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Add resident"}
        </Button>
      </form>

      {showForm ? (
        <form
          className="max-w-xl space-y-3 rounded-lg border border-(--color-border) bg-(--color-paper) p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const parsed = createResidentSchema.safeParse({
                fullName: fd.get("fullName"),
                phone: fd.get("phone") || undefined,
                email: fd.get("email") || undefined,
                idType: fd.get("idType") || undefined,
                idNumber: fd.get("idNumber") || undefined,
                guardianName: fd.get("guardianName") || undefined,
                guardianPhone: fd.get("guardianPhone") || undefined,
              });
              if (!parsed.success) {
                setResult({
                  ok: false,
                  error: parsed.error.issues[0]?.message ?? "Invalid input",
                });
                return;
              }
              const res = await api(API_ROUTES.residents.root, {
                method: "POST",
                body: JSON.stringify(parsed.data),
              });
              setResult(res.ok ? { ok: true } : res);
              if (!res.ok && handleAuthFailure(res)) return;
              if (res.ok) {
                setShowForm(false);
                router.refresh();
              }
            });
          }}
        >
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" required disabled={pending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" disabled={pending} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" disabled={pending} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="idType">ID type</Label>
              <Input
                id="idType"
                name="idType"
                placeholder="Aadhaar"
                disabled={pending}
              />
            </div>
            <div>
              <Label htmlFor="idNumber">ID number</Label>
              <Input id="idNumber" name="idNumber" disabled={pending} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="guardianName">Guardian</Label>
              <Input id="guardianName" name="guardianName" disabled={pending} />
            </div>
            <div>
              <Label htmlFor="guardianPhone">Guardian phone</Label>
              <Input
                id="guardianPhone"
                name="guardianPhone"
                disabled={pending}
              />
            </div>
          </div>
          {result && !result.ok ? <FieldError>{result.error}</FieldError> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Create resident"}
          </Button>
        </form>
      ) : null}

      <DataTable
        columns={columns}
        rows={initial.residents}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            title="No residents yet"
            body="Add an applicant profile, then assign a bed from Allotment."
            action={
              <Button type="button" onClick={() => setShowForm(true)}>
                Add resident
              </Button>
            }
          />
        }
      />

      <p className="text-sm text-(--color-muted)">
        {initial.total} resident{initial.total === 1 ? "" : "s"}
        {" · "}
        <Link href="/dashboard/allotment" className="underline">
          Assign beds
        </Link>
      </p>

      {historyFor && history ? (
        <section className="rounded-lg border border-(--color-border) bg-(--color-paper) p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg text-(--color-ink)">
              History · {historyFor.fullName}
            </h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setHistoryFor(null);
                setHistory(null);
              }}
            >
              Close
            </Button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-(--color-muted)">No allotment history.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-(--color-border) py-2 last:border-0"
                >
                  <span>
                    {a.bed.blockName} · {a.bed.roomNumber}-{a.bed.label}
                  </span>
                  <span className="text-(--color-muted)">
                    {a.startAt.slice(0, 10)}
                    {" → "}
                    {a.endAt ? a.endAt.slice(0, 10) : "present"} · {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
