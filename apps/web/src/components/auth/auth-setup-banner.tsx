import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import {
  isAuthBypassMisconfigured,
  isAuthDevBypass,
  isClerkConfigured,
} from "@/lib/utils";

/** Explains why Clerk sign-in may not appear (local dev only). */
export function AuthSetupBanner() {
  if (process.env.NODE_ENV === "production") return null;

  const bypass = isAuthDevBypass();
  const bypassMismatch = isAuthBypassMisconfigured();
  const clerkReady = isClerkConfigured();

  if (clerkReady && !bypass) return null;

  let title = "Clerk sign-in is not active";
  let body: ReactNode;

  if (bypassMismatch) {
    title = "Auth bypass flags disagree";
    body = (
      <>
        Set both <code className="font-mono text-xs">AUTH_DEV_BYPASS</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_AUTH_DEV_BYPASS</code>{" "}
        to the same value in root <code className="font-mono text-xs">.env</code>
        , then restart <code className="font-mono text-xs">npm run dev:fast</code>.
      </>
    );
  } else if (bypass) {
    body = (
      <>
        Dev bypass is on — the app skips Clerk and uses the demo admin session.
        To use Clerk: set both bypass flags to{" "}
        <code className="font-mono text-xs">false</code>, add keys below, restart
        dev.
      </>
    );
  } else {
    body = (
      <>
        Bypass is off but Clerk keys are missing from root{" "}
        <code className="font-mono text-xs">.env</code>. Add{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>{" "}
        and <code className="font-mono text-xs">CLERK_SECRET_KEY</code> from{" "}
        <a
          href="https://dashboard.clerk.com"
          className="text-(--color-accent) hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          dashboard.clerk.com
        </a>
        , then restart dev.
      </>
    );
  }

  return (
    <div
      role="status"
      className="border-b border-(--status-partial) bg-(--status-partial-bg) px-6 py-3 text-sm text-(--color-ink) md:px-10"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-(--color-ink-soft)">{body}</p>
      {!clerkReady && !bypass ? (
        <ButtonLink href="/sign-in" className="mt-2" size="sm" variant="secondary">
          Open sign-in setup
        </ButtonLink>
      ) : null}
    </div>
  );
}
