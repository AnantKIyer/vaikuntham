import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isAuthDevBypass, isClerkConfigured } from "@/lib/utils";

export default function HomePage() {
  const bypass = isAuthDevBypass();
  const clerkReady = isClerkConfigured();
  const canEnterApp = bypass || clerkReady;

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <p className="font-display text-2xl tracking-tight text-(--color-ink)">
          Vaikuntham
        </p>
        <div className="flex items-center gap-2">
          {clerkReady && !bypass ? (
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
          ) : null}
          {canEnterApp ? (
            <Link href="/dashboard">
              <Button size="sm">Open app</Button>
            </Link>
          ) : (
            <Link href="/sign-in">
              <Button size="sm">Set up auth</Button>
            </Link>
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
              <Link href="/dashboard">
                <Button size="lg">Enter dashboard</Button>
              </Link>
            ) : null}
            {clerkReady && !bypass ? (
              <Link href="/sign-in">
                <Button size="lg" variant={canEnterApp ? "secondary" : "primary"}>
                  Staff sign in
                </Button>
              </Link>
            ) : !canEnterApp ? (
              <Link href="/sign-in">
                <Button size="lg">Configure auth</Button>
              </Link>
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
