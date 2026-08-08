import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isClerkConfigured() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const sk = process.env.CLERK_SECRET_KEY?.trim();
  return Boolean(
    pk &&
      sk &&
      (pk.startsWith("pk_test_") || pk.startsWith("pk_live_")) &&
      sk.startsWith("sk_"),
  );
}

/**
 * Dev-only auth bypass. Requires BOTH flags so middleware/session and the
 * browser stay in sync (ClerkProvider skipped only when NEXT_PUBLIC_ is set).
 */
export function isAuthDevBypass() {
  if (process.env.NODE_ENV === "production") return false;
  return (
    process.env.AUTH_DEV_BYPASS === "true" &&
    process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === "true"
  );
}

/** True when bypass flags disagree — causes Clerk 401s or broken sign-in. */
export function isAuthBypassMisconfigured() {
  if (process.env.NODE_ENV === "production") return false;
  const server = process.env.AUTH_DEV_BYPASS === "true";
  const client = process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === "true";
  return server !== client;
}
