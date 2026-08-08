import type { Role } from "@prisma/client";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  Breadcrumbs,
  type Crumb,
} from "@/components/layout/breadcrumbs";

export function AppShell({
  children,
  title,
  description,
  actions,
  role,
  hostelName,
  breadcrumbs,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  role: Role;
  hostelName?: string | null;
  breadcrumbs?: Crumb[];
}) {
  return (
    <div className="flex min-h-screen bg-(--color-canvas)">
      <div className="sticky top-0 hidden h-screen md:block">
        <Sidebar role={role} hostelName={hostelName} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="border-b border-(--color-border) bg-(--color-paper)/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
          <p className="mb-2 font-display text-lg text-(--color-ink) md:hidden">
            Vaikuntham
          </p>
          {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl tracking-tight text-(--color-ink)">
                {title}
              </h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm text-(--color-muted)">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex items-center gap-2">{actions}</div>
            ) : null}
          </div>
        </header>
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
      <MobileNav role={role} />
    </div>
  );
}
