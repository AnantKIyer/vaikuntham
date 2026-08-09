"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ApiClientProvider } from "@/lib/api/client";
import { isAuthDevBypass } from "@/lib/utils";

function getPublishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (!key) return null;
  if (!key.startsWith("pk_test_") && !key.startsWith("pk_live_")) return null;
  return key;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const publishableKey = getPublishableKey();
  const bypass = isAuthDevBypass();

  const tree = <ApiClientProvider>{children}</ApiClientProvider>;

  if (!publishableKey || bypass) {
    return tree;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
    >
      {tree}
    </ClerkProvider>
  );
}
