"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BedDouble,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/rooms", label: "Rooms & beds", icon: Building2 },
  { href: "/dashboard/residents", label: "Residents", icon: Users },
  { href: "/dashboard/allotment", label: "Allotment", icon: BedDouble },
  { href: "/dashboard/fees", label: "Fees", icon: Receipt },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-5 py-5">
        <Link href="/dashboard" className="block">
          <p className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--color-ink)]">
            Vaikuntham
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Hostel management
          </p>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Primary">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                  : "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-ink)]",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--color-border)] p-4 text-xs text-[var(--color-muted)]">
        Phase 1 foundation
      </div>
    </aside>
  );
}
