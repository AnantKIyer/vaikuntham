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
