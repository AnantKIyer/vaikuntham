import {
  API_ROUTES,
  type BillingResidentsListDto,
  type DuesListDto,
  type FeePlansListDto,
  type InvoicesListDto,
} from "@vaikuntham/shared";
import { DashboardShell, requirePagePermission } from "@/components/layout/dashboard-shell";
import { FeesPanel } from "@/components/fees/fees-panel";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";

export const metadata = { title: "Fees" };

export default async function FeesPage() {
  const session = await requirePagePermission("managePayments");

  const [plansRes, invoicesRes, duesRes, residentsRes] = await Promise.all([
    apiFetch<FeePlansListDto>(API_ROUTES.fees.plans),
    apiFetch<InvoicesListDto>(API_ROUTES.fees.invoices),
    apiFetch<DuesListDto>(API_ROUTES.payments.dues),
    apiFetch<BillingResidentsListDto>(API_ROUTES.fees.billingResidents),
  ]);

  for (const res of [plansRes, invoicesRes, duesRes, residentsRes]) {
    redirectOnApiAuthFailure(res);
  }
  if (!plansRes.ok || !invoicesRes.ok || !duesRes.ok || !residentsRes.ok) {
    throw new Error("Failed to load fees data");
  }

  return (
    <DashboardShell
      session={session}
      title="Fees"
      description="Fee plans, invoices, payments, and open dues."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Fees" },
      ]}
    >
      <FeesPanel
        initialPlans={plansRes.data}
        initialInvoices={invoicesRes.data}
        initialDues={duesRes.data}
        residents={residentsRes.data}
      />
    </DashboardShell>
  );
}
