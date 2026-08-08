"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@vaikuntham/shared";
import { navForRole } from "@/lib/nav";

/** Warm RSC payloads for dashboard routes after first paint. */
export function DashboardNavPrefetch({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    for (const { href } of navForRole(role)) {
      if (href === pathname) continue;
      router.prefetch(href);
    }
  }, [role, router, pathname]);

  return null;
}
