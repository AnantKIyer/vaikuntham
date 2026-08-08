import { SignUp } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/utils";
import Link from "next/link";

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-6 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]">
            Sign up
          </h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Add Clerk keys to .env to enable registration.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)] underline-offset-2 hover:underline"
          >
            Continue to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SignUp />
    </div>
  );
}
