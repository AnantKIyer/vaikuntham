import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={cn("skeleton-shimmer rounded-md", className)}
      style={style}
    />
  );
}

/** Wrapper for skeleton groups — exposes busy state to assistive tech. */
export function SkeletonGroup({
  label = "Loading content",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={className}
      role="status"
    >
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}
