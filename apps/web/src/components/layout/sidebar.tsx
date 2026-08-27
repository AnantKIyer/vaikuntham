"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@vaikuntham/shared";
import { cn, isAuthDevBypass } from "@/lib/utils";
import { navGroupsForRole } from "@/lib/nav";
import { ROLE_LABELS } from "@vaikuntham/shared";

import { AvatarSkeleton } from "@/components/ui/page-skeletons";
import { BypassExitButton } from "@/components/layout/sign-out-control";

const UserButton = dynamic(
  () => import("@clerk/nextjs").then((m) => ({ default: m.UserButton })),
  {
    ssr: false,
    loading: () => <AvatarSkeleton />,
  },
);

const ClerkSignOutButton = dynamic(
  () =>
    import("@/components/layout/sign-out-control").then((m) => ({
      default: m.ClerkSignOutButton,
    })),
  { ssr: false },
);

export function Sidebar({
  role,
  hostelName,
}: {
  role: Role;
  hostelName?: string | null;
}) {
  const pathname = usePathname();
  const groups = navGroupsForRole(role);
  const clerkSession =
    !isAuthDevBypass() &&
    Boolean(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_"),
    );

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-(--color-border) bg-(--color-surface)">
      <div className="border-b border-(--color-border) px-5 py-5">
        <Link href="/dashboard" className="block">
          <p className="font-display text-xl tracking-tight text-(--color-ink)">
            Vaikuntham
          </p>
          <p className="mt-0.5 truncate text-xs text-(--color-muted)">
            {hostelName ?? "Hostel management"}
          </p>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3" aria-label="Primary">
        {groups.map((group) => (
          <div key={group.section}>
            {groups.length > 1 ? (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-(--color-muted)">
                {group.label}
              </p>
            ) : null}
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-(--color-ink) text-(--color-paper)"
                        : "text-(--color-ink-soft) hover:bg-(--color-surface-elevated) hover:text-(--color-ink)",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-(--color-border) p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-(--color-ink)">
              {ROLE_LABELS[role]}
            </p>
            <p className="text-[10px] text-(--color-muted)">
              {clerkSession ? "Signed in" : "Dev bypass"}
            </p>
          </div>
          {clerkSession ? <UserButton /> : null}
        </div>
        <div className="mt-2">
          {clerkSession ? <ClerkSignOutButton /> : <BypassExitButton />}
        </div>
      </div>
    </aside>
  );
}
