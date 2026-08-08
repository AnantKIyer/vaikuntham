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

export function isAuthDevBypass() {
  if (process.env.NODE_ENV === "production") return false;
  return (
    process.env.AUTH_DEV_BYPASS === "true" &&
    process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === "true"
  );
}

export function isAuthBypassMisconfigured() {
  if (process.env.NODE_ENV === "production") return false;
  const server = process.env.AUTH_DEV_BYPASS === "true";
  const client = process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === "true";
  return server !== client;
}
