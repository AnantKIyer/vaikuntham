import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { AuthSetupBanner } from "@/components/auth/auth-setup-banner";
import { isAuthDevBypass, isClerkConfigured } from "@/lib/utils";

export default function HomePage() {
  const bypass = isAuthDevBypass();
  const clerkReady = isClerkConfigured();
  const canEnterApp = bypass || clerkReady;

  return (
    <div className="relative flex min-h-screen flex-col">
      <AuthSetupBanner />
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <p className="font-display text-2xl tracking-tight text-(--color-ink)">
          Vaikuntham
        </p>
        <div className="flex items-center gap-2">
          {clerkReady && !bypass ? (
            <ButtonLink href="/sign-in" variant="ghost" size="sm">
              Sign in
            </ButtonLink>
          ) : null}
          {canEnterApp ? (
            <ButtonLink href="/dashboard" size="sm">
              Open app
            </ButtonLink>
          ) : (
            <ButtonLink href="/sign-in" size="sm">
              Set up auth
            </ButtonLink>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center px-6 pb-24 md:px-10">
        <div className="max-w-2xl">
          <p className="font-display text-5xl leading-[1.1] tracking-tight text-(--color-ink) md:text-6xl">
            Vaikuntham
          </p>
          <p className="mt-4 max-w-lg text-lg text-(--color-ink-soft)">
            Hostel operations with clear allotment, fees, and occupancy —
            built for wardens and accountants who need the right action fast.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {canEnterApp ? (
              <ButtonLink href="/dashboard" size="lg">
                Enter dashboard
              </ButtonLink>
            ) : null}
            {clerkReady && !bypass ? (
              <ButtonLink
                href="/sign-in"
                size="lg"
                variant={canEnterApp ? "secondary" : "primary"}
              >
                Staff sign in
              </ButtonLink>
            ) : !canEnterApp ? (
              <ButtonLink href="/sign-in" size="lg">
                Configure auth
              </ButtonLink>
            ) : null}
          </div>
          <p className="mt-10 text-sm text-(--color-muted)">
            Phase 1 foundation · Next.js · Neon Postgres · Prisma · Clerk
            {bypass ? " · auth bypass" : ""}
          </p>
        </div>
      </main>
    </div>
  );
}
