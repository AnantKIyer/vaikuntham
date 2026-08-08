import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Bone({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <Skeleton className={className} style={style} />;
}

export function PageHeaderSkeleton() {
  return (
    <header className="border-b border-(--color-border) bg-(--color-paper)/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
      <SkeletonGroup label="Loading page header">
        <Bone className="mb-2 h-3 w-24" />
        <Bone className="h-8 w-56 max-w-full" />
        <Bone className="mt-2 h-4 w-80 max-w-full" />
      </SkeletonGroup>
    </header>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonGroup label="Loading dashboard metrics">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-(--color-border) bg-(--color-paper) px-4 py-4"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <Bone className="h-3 w-16" style={{ animationDelay: `${i * 75}ms` }} />
            <Bone
              className="mt-3 h-9 w-20"
              style={{ animationDelay: `${i * 75 + 50}ms` }}
            />
            <Bone
              className="mt-2 h-3 w-28"
              style={{ animationDelay: `${i * 75 + 100}ms` }}
            />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

export function FoundationSectionSkeleton() {
  return (
    <div className="mt-8 rounded-lg border border-(--color-border) bg-(--color-paper) p-5">
      <Bone className="h-6 w-40" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Bone className="h-6 w-14 shrink-0 rounded-full" />
            <Bone className="h-4 flex-1 max-w-xs" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardContentSkeleton() {
  return (
    <SkeletonGroup label="Loading dashboard">
      <KpiGridSkeleton />
      <FoundationSectionSkeleton />
    </SkeletonGroup>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <SkeletonGroup label="Loading table">
      <div className="overflow-hidden rounded-lg border border-(--color-border) bg-(--color-paper)">
        <div className="border-b border-(--color-border) bg-(--color-surface)/50 px-4 py-3">
          <div className="flex gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-3 w-16" />
            ))}
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-4 border-b border-(--color-border)/60 px-4 py-3 last:border-b-0",
            )}
          >
            <Bone className="h-4 w-28" style={{ animationDelay: `${i * 40}ms` }} />
            <Bone className="h-4 flex-1 max-w-[8rem]" style={{ animationDelay: `${i * 40 + 20}ms` }} />
            <Bone className="h-4 w-20" style={{ animationDelay: `${i * 40 + 40}ms` }} />
            <Bone className="h-6 w-16 rounded-full" style={{ animationDelay: `${i * 40 + 60}ms` }} />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

export function FormSectionSkeleton() {
  return (
    <SkeletonGroup label="Loading form">
      <div className="space-y-3">
        <Bone className="h-4 w-24" />
        <Bone className="h-10 w-full" />
        <Bone className="h-10 w-full" />
        <Bone className="h-9 w-24" />
      </div>
    </SkeletonGroup>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-(--color-border) bg-(--color-paper) p-5",
        className,
      )}
    >
      <Bone className="h-6 w-32" />
      <Bone className="mt-4 h-24 w-full" />
    </div>
  );
}

export function RoomsContentSkeleton() {
  return (
    <SkeletonGroup label="Loading rooms and beds">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <aside className="space-y-6">
          <CardSkeleton />
          <CardSkeleton className="h-36" />
        </aside>
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Bone className="h-6 w-16" />
            <Bone className="h-6 w-10 rounded-full" />
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Bone key={i} className="h-8 w-14 rounded-md" />
            ))}
          </div>
          <TableSkeleton rows={6} />
        </section>
      </div>
    </SkeletonGroup>
  );
}

export function RoomsPageSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="flex-1 px-4 py-5 md:px-6 md:py-6">
        <RoomsContentSkeleton />
      </div>
    </>
  );
}

export function DashboardRouteSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="flex-1 px-4 py-5 md:px-6 md:py-6">
        <DashboardContentSkeleton />
      </div>
    </>
  );
}

export function SettingsContentSkeleton() {
  return (
    <SkeletonGroup label="Loading settings">
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton className="h-48" />
        <CardSkeleton className="h-48" />
      </div>
      <div className="mt-6">
        <Bone className="mb-3 h-6 w-40" />
        <TableSkeleton rows={4} />
      </div>
    </SkeletonGroup>
  );
}

export function SettingsPageSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="flex-1 px-4 py-5 md:px-6 md:py-6">
        <SettingsContentSkeleton />
      </div>
    </>
  );
}

export function SidebarNavSkeleton() {
  return (
    <SkeletonGroup
      label="Loading navigation"
      className="flex h-full w-60 shrink-0 flex-col border-r border-(--color-border) bg-(--color-surface)"
    >
      <div className="border-b border-(--color-border) px-5 py-5">
        <Bone className="h-6 w-32" />
        <Bone className="mt-2 h-3 w-24" />
      </div>
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bone
            key={i}
            className="h-9 w-full rounded-md"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </SkeletonGroup>
  );
}

export function AvatarSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton
      className={cn("size-8 shrink-0 rounded-full", className)}
      aria-hidden
    />
  );
}
