import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium text-(--color-ink-soft)",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-(--color-border) bg-(--color-paper) px-3 text-sm text-(--color-ink) outline-none transition-colors placeholder:text-(--color-muted) focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent-soft) disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-(--color-border) bg-(--color-paper) px-3 py-2 text-sm text-(--color-ink) outline-none transition-colors placeholder:text-(--color-muted) focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent-soft) disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-(--color-danger)">{children}</p>;
}
