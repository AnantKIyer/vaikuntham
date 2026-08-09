import {
  API_ROUTES,
  BedStatus,
  type AllotmentsListDto,
  type BedsListDto,
  type ResidentsListDto,
} from "@vaikuntham/shared";
import { AllotmentPanel } from "@/components/allotment/allotment-panel";
import { DashboardShell, requirePagePermission } from "@/components/layout/dashboard-shell";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";

export const metadata = { title: "Allotment" };

export default async function AllotmentPage() {
  const session = await requirePagePermission("manageAllotment");

  const [allotments, residents, beds] = await Promise.all([
    apiFetch<AllotmentsListDto>(API_ROUTES.allotments.root),
    apiFetch<ResidentsListDto>(API_ROUTES.residents.root),
    apiFetch<BedsListDto>(
      `${API_ROUTES.structure.beds}?status=${BedStatus.VACANT}`,
    ),
  ]);

  redirectOnApiAuthFailure(allotments);
  redirectOnApiAuthFailure(residents);
  redirectOnApiAuthFailure(beds);
  if (!allotments.ok) throw new Error(allotments.error);
  if (!residents.ok) throw new Error(residents.error);
  if (!beds.ok) throw new Error(beds.error);

  return (
    <DashboardShell
      session={session}
      title="Allotment"
      description="Assign and end bed stays with transactional integrity."
      breadcrumbs={[
        { href: "/dashboard", label: "App" },
        { label: "Allotment" },
      ]}
    >
      <AllotmentPanel
        initial={allotments.data}
        assignableResidents={residents.data}
        vacantBeds={beds.data}
      />
    </DashboardShell>
  );
}
