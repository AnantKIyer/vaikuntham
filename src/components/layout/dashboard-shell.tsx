import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import type { Crumb } from "@/components/layout/breadcrumbs";
import {
  AuthError,
  requireSession,
  type SessionContext,
} from "@/server/auth/session";
import { can, type Permission } from "@/lib/permissions";
import { isAuthDevBypass, isClerkConfigured } from "@/lib/utils";

/**
 * Resolves the staff session for dashboard routes.
 * Unauthenticated users go to sign-in (Clerk) or home (no auth configured).
 */
export async function loadDashboardSession(): Promise<SessionContext> {
  try {
    return await requireSession();
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") {
      if (isClerkConfigured() && !isAuthDevBypass()) {
        redirect("/sign-in");
      }
      redirect("/");
    }
    throw e;
  }
}

/** Session + permission check; forbidden roles return to dashboard. */
export async function requirePagePermission(
  permission: Permission,
): Promise<SessionContext> {
  const session = await loadDashboardSession();
  if (!can(session.role, permission)) {
    redirect("/dashboard");
  }
  return session;
}

export async function DashboardShell({
  children,
  title,
  description,
  actions,
  breadcrumbs,
  session: sessionProp,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  session?: SessionContext;
}) {
  const session = sessionProp ?? (await loadDashboardSession());

  return (
    <AppShell
      title={title}
      description={description}
      actions={actions}
      role={session.role}
      hostelName={session.hostelName}
      breadcrumbs={breadcrumbs}
    >
      {children}
    </AppShell>
  );
}
