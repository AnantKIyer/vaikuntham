import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-(--color-border) bg-(--color-paper) px-6 py-12 text-center",
        className,
      )}
    >
      <p className="font-display text-lg text-(--color-ink)">{title}</p>
      {body ? (
        <p className="mt-2 max-w-md text-sm text-(--color-muted)">{body}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
