import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--color-ink)]">
          Vaikuntham
        </p>
        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm">Open app</Button>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center px-6 pb-24 md:px-10">
        <div className="max-w-2xl">
          <p className="font-[family-name:var(--font-display)] text-5xl leading-[1.1] tracking-tight text-[var(--color-ink)] md:text-6xl">
            Vaikuntham
          </p>
          <p className="mt-4 max-w-lg text-lg text-[var(--color-ink-soft)]">
            Hostel operations with clear allotment, fees, and occupancy —
            built for wardens and accountants who need the right action fast.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button size="lg">Enter dashboard</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="secondary">
                Staff sign in
              </Button>
            </Link>
          </div>
          <p className="mt-10 text-sm text-[var(--color-muted)]">
            Phase 1 foundation · Next.js · Neon Postgres · Prisma · Clerk
          </p>
        </div>
      </main>
    </div>
  );
}
