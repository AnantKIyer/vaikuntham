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
