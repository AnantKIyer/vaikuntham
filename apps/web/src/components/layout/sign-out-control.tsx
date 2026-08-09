"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

/** Clerk-backed sign out — only mount inside ClerkProvider. */
export function ClerkSignOutButton() {
  const { signOut } = useClerk();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-auto px-2 py-1 text-[11px] text-(--color-muted) hover:text-(--color-ink)"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void signOut({ redirectUrl: "/" });
        });
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}

/** Dev-bypass has no Clerk session — return to the marketing/home surface. */
export function BypassExitButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-auto px-2 py-1 text-[11px] text-(--color-muted) hover:text-(--color-ink)"
      onClick={() => router.push("/")}
    >
      Exit
    </Button>
  );
}
