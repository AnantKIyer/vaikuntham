"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  API_ROUTES,
  FEE_LINE_KIND_VALUES,
  PAYMENT_METHOD_VALUES,
  createFeePlanSchema,
  formatPaise,
  generateInvoiceSchema,
  recordPaymentSchema,
  type CreateFeePlanInput,
  type ApiFailure,
  type BillingResidentsListDto,
  type DuesListDto,
  type FeePlanDto,
  type FeePlansListDto,
  type InvoiceDto,
  type InvoicesListDto,
  type RecordPaymentInput,
  type RecordPaymentResultDto,
} from "@vaikuntham/shared";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, Input, Label } from "@/components/ui/field";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { useApiClient } from "@/lib/api/client";
import { useAuthFailureHandler } from "@/lib/api/use-auth-failure-handler";

type Tab = "plans" | "invoices" | "dues";

type ActionResult = { ok: true } | ApiFailure;

function invoiceTone(status: string): StatusTone {
  if (status === "PAID") return "vacant";
  if (status === "PARTIAL") return "partial";
  if (status === "VOID") return "blocked";
  return "occupied";
}

function periodLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dueAgeLabel(days: number | null): string {
  if (days == null) return "—";
  if (days === 0) return "Due today";
  return `${days}d overdue`;
}

export function FeesPanel({
  initialPlans,
  initialInvoices,
  initialDues,
  residents,
}: {
  initialPlans: FeePlansListDto;
  initialInvoices: InvoicesListDto;
  initialDues: DuesListDto;
  residents: BillingResidentsListDto;
}) {
  const api = useApiClient();
  const router = useRouter();
  const handleAuthFailure = useAuthFailureHandler();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>("plans");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [plans, setPlans] = useState(initialPlans.plans);
  const [invoices, setInvoices] = useState(initialInvoices.invoices);
  const [dues, setDues] = useState(initialDues);

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planName, setPlanName] = useState("");
  const [rentPaise, setRentPaise] = useState("800000");
  const [messPaise, setMessPaise] = useState("350000");
  const [depositPaise, setDepositPaise] = useState("500000");

  const [genResidentId, setGenResidentId] = useState(
    residents.residents[0]?.id ?? "",
  );
  const [genPeriod, setGenPeriod] = useState(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  });

  const [payInvoice, setPayInvoice] = useState<InvoiceDto | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<(typeof PAYMENT_METHOD_VALUES)[number]>("UPI");

  const [detailInvoice, setDetailInvoice] = useState<InvoiceDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const activeResidents = useMemo(
    () => residents.residents.filter((r) => r.status === "ACTIVE"),
    [residents.residents],
  );

  async function openInvoiceDetail(id: string) {
    setDetailLoading(true);
    const res = await api<InvoiceDto>(API_ROUTES.fees.invoice(id));
    setDetailLoading(false);
    if (!res.ok && handleAuthFailure(res)) return;
    if (!res.ok) {
      setResult(res);
      return;
    }
    setDetailInvoice(res.data);
  }

  const invoiceColumns = useMemo<DataTableColumn<InvoiceDto>[]>(
    () => [
      {
        key: "resident",
        header: "Resident",
        cell: (inv) => (
          <button
            type="button"
            className="text-left"
            onClick={() => openInvoiceDetail(inv.id)}
          >
            <div className="font-medium text-(--color-ink) hover:underline">
              {inv.residentName}
            </div>
            <div className="text-xs text-(--color-muted)">
              {periodLabel(inv.periodStart)}
            </div>
          </button>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        cell: (inv) => formatPaise(inv.amountPaise),
      },
      {
        key: "balance",
        header: "Balance",
        cell: (inv) => formatPaise(inv.balancePaise),
      },
      {
        key: "status",
        header: "Status",
        cell: (inv) => (
          <StatusPill tone={invoiceTone(inv.status)}>{inv.status}</StatusPill>
        ),
      },
      {
        key: "actions",
        header: "",
        cell: (inv) => (
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openInvoiceDetail(inv.id)}
            >
              View
            </Button>
            {inv.status === "ISSUED" || inv.status === "PARTIAL" ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPayInvoice(inv);
                  setPayAmount(String(inv.balancePaise));
                }}
              >
                Record payment
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [openInvoiceDetail],
  );

  const duesColumns = useMemo<DataTableColumn<(typeof dues.rows)[number]>[]>(
    () => [
      { key: "name", header: "Resident", cell: (r) => r.residentName },
      {
        key: "open",
        header: "Open balance",
        cell: (r) => formatPaise(r.openBalancePaise),
      },
      {
        key: "age",
        header: "Age",
        cell: (r) => dueAgeLabel(r.dueAgeDays),
      },
      {
        key: "count",
        header: "Invoices",
        cell: (r) => String(r.invoiceCount),
      },
    ],
    [],
  );

  async function refreshAll() {
    const [p, i, d] = await Promise.all([
      api<FeePlansListDto>(API_ROUTES.fees.plans),
      api<InvoicesListDto>(API_ROUTES.fees.invoices),
      api<DuesListDto>(API_ROUTES.payments.dues),
    ]);
    if (p.ok) setPlans(p.data.plans);
    if (i.ok) setInvoices(i.data.invoices);
    if (d.ok) setDues(d.data);
  }

  function createPlan() {
    const rent = Number(rentPaise);
    const mess = Number(messPaise);
    const deposit = Number(depositPaise);
    const lines: CreateFeePlanInput["lines"] = [
      { label: "Monthly rent", kind: "RENT", amountPaise: rent },
      { label: "Mess charges", kind: "MESS", amountPaise: mess },
    ];
    if (deposit > 0) {
      lines.push({
        label: "Security deposit",
        kind: "DEPOSIT",
        amountPaise: deposit,
      });
    }
    const parsed = createFeePlanSchema.safeParse({
      name: planName,
      isDefault: plans.length === 0,
      lines,
    });
    if (!parsed.success) {
      setResult({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" });
      return;
    }
    start(async () => {
      const res = await api<FeePlanDto>(API_ROUTES.fees.plans, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok && handleAuthFailure(res)) return;
      if (!res.ok) {
        setResult(res);
        return;
      }
      setResult({ ok: true });
      setShowPlanForm(false);
      setPlanName("");
      await refreshAll();
    });
  }

  function generateInvoice() {
    const parsed = generateInvoiceSchema.safeParse({
      residentId: genResidentId,
      periodStart: genPeriod,
    });
    if (!parsed.success) {
      setResult({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" });
      return;
    }
    start(async () => {
      const res = await api<InvoiceDto>(API_ROUTES.fees.generateInvoice, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok && handleAuthFailure(res)) return;
      if (!res.ok) {
        setResult(res);
        return;
      }
      setResult({ ok: true });
      setTab("invoices");
      await refreshAll();
    });
  }

  function voidInvoice(id: string) {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    start(async () => {
      const res = await api<InvoiceDto>(API_ROUTES.fees.voidInvoice(id), {
        method: "PATCH",
      });
      if (!res.ok && handleAuthFailure(res)) return;
      if (!res.ok) {
        setResult(res);
        return;
      }
      setResult({ ok: true });
      setDetailInvoice(res.data);
      await refreshAll();
    });
  }

  function submitPayment() {
    if (!payInvoice) return;
    const amountPaise = Number(payAmount);
    const payload: RecordPaymentInput = {
      invoiceId: payInvoice.id,
      amountPaise,
      method: payMethod,
      idempotencyKey: `pay-${payInvoice.id}-${Date.now()}`,
    };
    const parsed = recordPaymentSchema.safeParse(payload);
    if (!parsed.success) {
      setResult({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" });
      return;
    }
    start(async () => {
      const res = await api<RecordPaymentResultDto>(API_ROUTES.payments.root, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok && handleAuthFailure(res)) return;
      if (!res.ok) {
        setResult(res);
        return;
      }
      setResult({ ok: true });
      setPayInvoice(null);
      await refreshAll();
      router.push(`/dashboard/fees/receipts/${res.data.payment.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-(--color-border) pb-3">
        {(
          [
            ["plans", "Fee plans"],
            ["invoices", "Invoices"],
            ["dues", "Dues"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={tab === id ? "primary" : "ghost"}
            size="sm"
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {result && !result.ok ? (
        <FieldError>{result.error}</FieldError>
      ) : null}

      {tab === "plans" ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-(--color-ink-soft)">
              Amounts stored as integer paise. Default plan used when generating
              invoices. Demo path issues invoices directly as ISSUED.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowPlanForm((v) => !v)}
            >
              {showPlanForm ? "Cancel" : "Add plan"}
            </Button>
          </div>
          {showPlanForm ? (
            <div className="rounded-lg border border-(--color-border) bg-(--color-paper) p-4 space-y-3 max-w-md">
              <div>
                <Label htmlFor="plan-name">Plan name</Label>
                <Input
                  id="plan-name"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Standard monthly"
                />
              </div>
              <div>
                <Label htmlFor="rent-paise">Rent (paise)</Label>
                <Input
                  id="rent-paise"
                  value={rentPaise}
                  onChange={(e) => setRentPaise(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mess-paise">Mess (paise)</Label>
                <Input
                  id="mess-paise"
                  value={messPaise}
                  onChange={(e) => setMessPaise(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="deposit-paise">Deposit (paise, optional)</Label>
                <Input
                  id="deposit-paise"
                  value={depositPaise}
                  onChange={(e) => setDepositPaise(e.target.value)}
                />
              </div>
              <p className="text-xs text-(--color-muted)">
                Line kinds: {FEE_LINE_KIND_VALUES.join(", ")}
              </p>
              <Button type="button" disabled={pending} onClick={createPlan}>
                Save plan
              </Button>
            </div>
          ) : null}
          {plans.length === 0 ? (
            <EmptyState
              title="No fee plans"
              body="Create a plan before generating invoices."
            />
          ) : (
            <ul className="space-y-3">
              {plans.map((plan) => (
                <li
                  key={plan.id}
                  className="rounded-lg border border-(--color-border) bg-(--color-paper) px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-(--color-ink)">
                      {plan.name}
                    </span>
                    {plan.isDefault ? (
                      <StatusPill tone="vacant">Default</StatusPill>
                    ) : null}
                    <span className="ml-auto text-sm text-(--color-ink)">
                      {formatPaise(plan.totalPaise)}
                    </span>
                  </div>
                  <ul className="mt-2 text-xs text-(--color-muted) space-y-1">
                    {plan.lines.map((l) => (
                      <li key={l.id}>
                        {l.label} ({l.kind}): {formatPaise(l.amountPaise)}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "invoices" ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-(--color-border) bg-(--color-paper) p-4 grid gap-3 sm:grid-cols-3 max-w-3xl">
            <div>
              <Label htmlFor="gen-resident">Resident</Label>
              <select
                id="gen-resident"
                className="mt-1 w-full rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm"
                value={genResidentId}
                onChange={(e) => setGenResidentId(e.target.value)}
              >
                {activeResidents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="gen-period">Period (YYYY-MM)</Label>
              <Input
                id="gen-period"
                value={genPeriod}
                onChange={(e) => setGenPeriod(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={pending || plans.length === 0 || !genResidentId}
                onClick={generateInvoice}
              >
                Generate invoice
              </Button>
            </div>
          </div>
          {invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              body="Generate an invoice for an active resident."
            />
          ) : (
            <DataTable
              columns={invoiceColumns}
              rows={invoices}
              rowKey={(inv) => inv.id}
            />
          )}
        </section>
      ) : null}

      {tab === "dues" ? (
        <section className="space-y-4">
          <p className="text-sm text-(--color-ink-soft)">
            Total open:{" "}
            <strong className="text-(--color-ink)">
              {formatPaise(dues.totalOpenPaise)}
            </strong>
          </p>
          {dues.rows.length === 0 ? (
            <EmptyState title="No open dues" body="All invoices are paid or void." />
          ) : (
            <DataTable
              columns={duesColumns}
              rows={dues.rows}
              rowKey={(r) => r.residentId}
            />
          )}
        </section>
      ) : null}

      {detailInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-(--color-border) bg-(--color-paper) p-5 shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-(--color-ink)">
                  Invoice detail
                </h3>
                <p className="text-sm text-(--color-muted)">
                  {detailInvoice.residentName} · {periodLabel(detailInvoice.periodStart)}
                </p>
              </div>
              <StatusPill tone={invoiceTone(detailInvoice.status)}>
                {detailInvoice.status}
              </StatusPill>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-(--color-muted)">Amount</dt>
                <dd className="text-(--color-ink)">{formatPaise(detailInvoice.amountPaise)}</dd>
              </div>
              <div>
                <dt className="text-(--color-muted)">Balance</dt>
                <dd className="text-(--color-ink)">{formatPaise(detailInvoice.balancePaise)}</dd>
              </div>
              {detailInvoice.feePlanName ? (
                <div className="col-span-2">
                  <dt className="text-(--color-muted)">Fee plan</dt>
                  <dd className="text-(--color-ink)">{detailInvoice.feePlanName}</dd>
                </div>
              ) : null}
            </dl>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-(--color-muted) mb-2">
                Line items
              </h4>
              <ul className="space-y-1 text-sm">
                {detailInvoice.lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex justify-between gap-2 text-(--color-ink-soft)"
                  >
                    <span>
                      {line.label} ({line.kind})
                    </span>
                    <span>{formatPaise(line.amountPaise)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 justify-end">
              {(detailInvoice.status === "ISSUED" ||
                detailInvoice.status === "PARTIAL") && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPayInvoice(detailInvoice);
                    setPayAmount(String(detailInvoice.balancePaise));
                  }}
                >
                  Record payment
                </Button>
              )}
              {(detailInvoice.status === "ISSUED" ||
                detailInvoice.status === "DRAFT") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => voidInvoice(detailInvoice.id)}
                >
                  Void
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDetailInvoice(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {detailLoading ? (
        <p className="text-sm text-(--color-muted)">Loading invoice…</p>
      ) : null}

      {payInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-(--color-border) bg-(--color-paper) p-5 shadow-lg space-y-4">
            <h3 className="font-display text-lg text-(--color-ink)">
              Record payment
            </h3>
            <p className="text-sm text-(--color-muted)">
              {payInvoice.residentName} — balance{" "}
              {formatPaise(payInvoice.balancePaise)}
            </p>
            <div>
              <Label htmlFor="pay-amount">Amount (paise)</Label>
              <Input
                id="pay-amount"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pay-method">Method</Label>
              <select
                id="pay-method"
                className="mt-1 w-full rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm"
                value={payMethod}
                onChange={(e) =>
                  setPayMethod(e.target.value as (typeof PAYMENT_METHOD_VALUES)[number])
                }
              >
                {PAYMENT_METHOD_VALUES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPayInvoice(null)}
              >
                Cancel
              </Button>
              <Button type="button" disabled={pending} onClick={submitPayment}>
                Record
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
