import { cache } from "react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import type { Crumb } from "@/components/layout/breadcrumbs";
import { API_ROUTES, can, type Permission, type SessionContext } from "@vaikuntham/shared";
import { apiFetch, redirectOnApiAuthFailure } from "@/lib/api/server";

/** One session lookup per RSC request (dedupes layout + page calls). */
export const loadDashboardSession = cache(async (): Promise<SessionContext> => {
  const result = await apiFetch<SessionContext>(API_ROUTES.session);

  if (!result.ok) {
    redirectOnApiAuthFailure(result);
    throw new Error(result.error);
  }

  return result.data;
});

export function ensurePagePermission(
  session: SessionContext,
  permission: Permission,
): void {
  if (!can(session.role, permission)) {
    redirect("/dashboard");
  }
}

/** Pages without a bundled session payload (placeholders). */
export async function requirePagePermission(
  permission: Permission,
): Promise<SessionContext> {
  const session = await loadDashboardSession();
  ensurePagePermission(session, permission);
  return session;
}

/** Page chrome — sidebar/mobile nav live in dashboard layout.tsx. */
export function DashboardShell({
  children,
  title,
  description,
  actions,
  breadcrumbs,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  /** @deprecated Session is loaded in layout; kept for call-site compatibility. */
  session?: SessionContext;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        breadcrumbs={breadcrumbs}
      />
      <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
    </>
  );
}
