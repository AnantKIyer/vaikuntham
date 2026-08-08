import { AppShell } from "@/components/layout/app-shell";
import { isClerkConfigured, isAuthDevBypass } from "@/lib/utils";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <AppShell
      title="Settings"
      description="Hostel profile, roles, and environment status."
    >
      <dl className="max-w-xl space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Clerk</dt>
          <dd className="font-medium text-[var(--color-ink)]">
            {isClerkConfigured() ? "Configured" : "Missing keys"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Auth bypass</dt>
          <dd className="font-medium text-[var(--color-ink)]">
            {isAuthDevBypass() ? "On (dev only)" : "Off"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Database</dt>
          <dd className="font-medium text-[var(--color-ink)]">
            {process.env.DATABASE_URL ? "DATABASE_URL set" : "Not configured"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Stack</dt>
          <dd className="font-medium text-[var(--color-ink)]">
            Next.js · Prisma 6 · Neon · Clerk
          </dd>
        </div>
      </dl>
    </AppShell>
  );
}
