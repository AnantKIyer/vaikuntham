"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { navForRole, type NavItem } from "@/lib/nav";

/** Prefer ops pages + Settings when the role has more than 5 nav items. */
function mobileItems(role: Role): NavItem[] {
  const items = navForRole(role);
  if (items.length <= 5) return items;

  const settings = items.find((i) => i.href === "/dashboard/settings");
  const withoutSecondary = items.filter(
    (i) =>
      i.href !== "/dashboard/settings" && i.href !== "/dashboard/audit",
  );
  const primary = withoutSecondary.slice(0, settings ? 4 : 5);
  return settings ? [...primary, settings] : primary;
}

/** Compact bottom nav for viewports where the sidebar is hidden. */
export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = mobileItems(role);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-(--color-border) bg-(--color-paper) px-2 pb-[env(safe-area-inset-bottom)] pt-1 md:hidden"
      aria-label="Mobile"
    >
      <ul className="flex items-stretch justify-between gap-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-1 py-2 text-[10px] font-medium",
                  active
                    ? "text-(--color-accent)"
                    : "text-(--color-muted)",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="truncate">{label.split(" ")[0]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
