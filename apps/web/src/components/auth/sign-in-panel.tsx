"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ClerkSignOutButton } from "@/components/layout/sign-out-control";
import { ButtonLink } from "@/components/ui/button";

export function SignInPanel({
  isSignedIn,
  routing = "path",
}: {
  isSignedIn: boolean;
  /** Use `hash` on unlisted staff entry pages (custom URL, no extra catch-all routes). */
  routing?: "path" | "hash";
}) {
  if (isSignedIn) {
    return (
      <div className="max-w-md rounded-lg border border-(--color-border) bg-(--color-paper) p-6 text-center">
        <h1 className="font-display text-xl text-(--color-ink)">
          Already signed in
        </h1>
        <p className="mt-3 text-sm text-(--color-ink-soft)">
          Sign out first if you need to use a different account (e.g.{" "}
          <strong>adminuser</strong>).
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <ClerkSignOutButton />
          <ButtonLink href="/dashboard" variant="secondary" size="sm">
            Continue to dashboard
          </ButtonLink>
          <Link
            href="/"
            className="text-sm text-(--color-muted) hover:text-(--color-ink)"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (routing === "hash") {
    return (
      <SignIn
        routing="hash"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
      />
    );
  }

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
