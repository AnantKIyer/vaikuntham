"use client";

import { ClerkProvider } from "@clerk/nextjs";

function getPublishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (!key) return null;
  if (!key.startsWith("pk_test_") && !key.startsWith("pk_live_")) return null;
  return key;
}

/** Client-visible bypass — must be NEXT_PUBLIC_ to skip Clerk JS in the browser */
function isClientAuthBypass(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === "true";
}

export function Providers({ children }: { children: React.ReactNode }) {
  const publishableKey = getPublishableKey();

  if (!publishableKey || isClientAuthBypass()) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
