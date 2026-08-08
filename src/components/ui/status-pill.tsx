import { cn } from "@/lib/utils";

const tones = {
  vacant: "bg-(--status-vacant-bg) text-(--status-vacant)",
  occupied: "bg-(--status-occupied-bg) text-(--status-occupied)",
  partial: "bg-(--status-partial-bg) text-(--status-partial)",
  overdue: "bg-(--status-overdue-bg) text-(--status-overdue)",
  blocked: "bg-(--status-blocked-bg) text-(--status-blocked)",
  neutral: "bg-(--color-surface) text-(--color-muted)",
} as const;

export type StatusTone = keyof typeof tones;

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
