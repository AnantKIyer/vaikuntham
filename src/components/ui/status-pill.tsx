import { cn } from "@/lib/utils";

const tones = {
  vacant: "bg-[var(--status-vacant-bg)] text-[var(--status-vacant)]",
  occupied: "bg-[var(--status-occupied-bg)] text-[var(--status-occupied)]",
  partial: "bg-[var(--status-partial-bg)] text-[var(--status-partial)]",
  overdue: "bg-[var(--status-overdue-bg)] text-[var(--status-overdue)]",
  blocked: "bg-[var(--status-blocked-bg)] text-[var(--status-blocked)]",
  neutral: "bg-[var(--color-surface)] text-[var(--color-muted)]",
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
