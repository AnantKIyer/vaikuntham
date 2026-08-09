export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_PROVISIONED"
      | "NO_HOSTEL" = "FORBIDDEN",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function isAuthDevBypass() {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.AUTH_DEV_BYPASS === "true";
}

/** True when the request is from loopback (shared non-prod envs must not auto-bypass). */
export function isLocalhostRequest(input: {
  host?: string;
  remoteAddress?: string;
}): boolean {
  const host = (input.host ?? "").split(":")[0]?.toLowerCase() ?? "";
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }
  const ip = (input.remoteAddress ?? "").replace(/^::ffff:/, "");
  return ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
}

/**
 * Dev bypass is env-gated and production-hard-false. On shared non-prod hosts,
 * require `x-auth-dev-bypass: true` or a localhost peer (CB-160 / S6).
 */
export function allowAuthDevBypass(input: {
  bypassHeader?: string;
  host?: string;
  remoteAddress?: string;
}): boolean {
  if (!isAuthDevBypass()) return false;
  const header = input.bypassHeader?.trim().toLowerCase();
  if (header === "1" || header === "true") return true;
  return isLocalhostRequest(input);
}

export function isClerkConfigured() {
  const sk = process.env.CLERK_SECRET_KEY?.trim();
  return Boolean(sk && sk.startsWith("sk_"));
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** One-shot ops token for hostel create / link-org (CB-151). */
export function assertBootstrapToken(authHeader?: string): void {
  const expected = process.env.HOSTEL_BOOTSTRAP_TOKEN?.trim();
  if (!expected) {
    throw new AuthError(
      "HOSTEL_BOOTSTRAP_TOKEN is not configured",
      "FORBIDDEN",
    );
  }

  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Bootstrap token required", "UNAUTHENTICATED");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || token !== expected) {
    throw new AuthError("Invalid bootstrap token", "UNAUTHENTICATED");
  }
}
