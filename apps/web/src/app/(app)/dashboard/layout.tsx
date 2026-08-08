import { DashboardNavPrefetch } from "@/components/layout/dashboard-nav-prefetch";
import { loadDashboardSession } from "@/components/layout/dashboard-shell";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await loadDashboardSession();

  return (
    <>
      <DashboardNavPrefetch role={session.role} />
      <div className="flex min-h-screen bg-(--color-canvas)">
        <div className="sticky top-0 hidden h-screen md:block">
          <Sidebar role={session.role} hostelName={session.hostelName} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
          {children}
        </div>
        <MobileNav role={session.role} />
      </div>
    </>
  );
}
