import {
  API_ROUTES,
  RESIDENT_STATUS_VALUES,
  type ResidentsListDto,
} from "@vaikuntham/shared";
import { DashboardShell, requirePagePermission } from "@/components/layout/dashboard-shell";
import { ResidentsPanel } from "@/components/residents/residents-panel";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";

export const metadata = { title: "Residents" };

export default async function ResidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requirePagePermission("manageResidents");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const statusRaw = params.status?.trim() ?? "ALL";
  const status =
    statusRaw !== "ALL" &&
    (RESIDENT_STATUS_VALUES as readonly string[]).includes(statusRaw)
      ? statusRaw
      : "ALL";

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (status !== "ALL") qs.set("status", status);
  const path = qs.size
    ? `${API_ROUTES.residents.root}?${qs.toString()}`
    : API_ROUTES.residents.root;

  const result = await apiFetch<ResidentsListDto>(path);
  redirectOnApiAuthFailure(result);
  if (!result.ok) {
    throw new Error(result.error);
  }

  return (
    <DashboardShell
      session={session}
      title="Residents"
      description="Profiles, guardians, and status."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Residents" },
      ]}
    >
      <ResidentsPanel
        initial={result.data}
        initialQ={q}
        initialStatus={status}
      />
    </DashboardShell>
  );
}
