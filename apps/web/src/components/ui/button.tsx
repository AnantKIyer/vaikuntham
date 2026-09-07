import Link, { type LinkProps } from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary:
    "bg-(--color-ink) text-(--color-paper) hover:bg-(--color-ink-soft)",
  secondary:
    "bg-(--color-surface) text-(--color-ink) border border-(--color-border) hover:bg-(--color-surface-elevated)",
  ghost: "bg-transparent text-(--color-ink) hover:bg-(--color-surface)",
  danger: "bg-(--color-danger) text-white hover:opacity-90",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent) disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClassName({ variant, size, className })}
        {...props}
      />
    );
  },
);

/** Next.js Link styled as Button — avoids invalid `<a><button>` nesting. */
export function ButtonLink({
  href,
  className,
  variant = "primary",
  size = "md",
  children,
}: LinkProps & {
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={buttonClassName({ variant, size, className })}
    >
      {children}
    </Link>
  );
}
