import Link from "next/link";
import { cn } from "@/lib/utils";

export type Crumb = { href?: string; label: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-(--color-muted)">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? <span aria-hidden>/</span> : null}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="hover:text-(--color-ink) hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(last && "font-medium text-(--color-ink-soft)")}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
