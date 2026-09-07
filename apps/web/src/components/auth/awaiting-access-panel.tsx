"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ClerkSignOutButton } from "@/components/layout/sign-out-control";
import { ButtonLink } from "@/components/ui/button";

export function AwaitingAccessPanel({
  staffEntryHref,
  isLocalDev = false,
}: {
  staffEntryHref?: string;
  /** From server — avoids reading `window` during render. */
  isLocalDev?: boolean;
}) {
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showUser = mounted && isLoaded;
  const username = showUser && user?.username ? user.username : null;
  const label =
    showUser && user
      ? (username ??
        user.primaryEmailAddress?.emailAddress ??
        user.id)
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <h1 className="font-display text-2xl text-(--color-ink)">
        Awaiting access
      </h1>
      <p className="mt-3 text-sm text-(--color-ink-soft)">
        Vaikuntham staff join by <strong>admin invite only</strong>. Your Clerk
        account is signed in, but there is no <strong>hostel membership</strong>{" "}
        in the database for this user yet.
      </p>
      {showUser && label ? (
        <p className="mt-4 rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink)">
          Signed in as <strong>{label}</strong>
        </p>
      ) : null}
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-(--color-ink-soft)">
        {showUser && username === "adminuser" ? (
          <li>
            You are signed in as <strong>adminuser</strong>, but the local DB has
            no membership row. Re-link with{" "}
            <code className="rounded bg-(--color-surface) px-1 font-mono text-xs">
              npm run provision:local-admin
            </code>{" "}
            (or{" "}
            <code className="rounded bg-(--color-surface) px-1 font-mono text-xs">
              npm run provision:link-user -- --username adminuser
            </code>
            ), then refresh.
          </li>
        ) : (
          <li>
            Ask a hostel admin to invite your work email from Settings, or sign
            in with an account that already has membership.
          </li>
        )}
        {isLocalDev ? (
          <li>
            Integration tests wipe the local database — if you ran{" "}
            <code className="font-mono text-xs">npm run test:integration</code>,
            re-run provisioning or{" "}
            <code className="font-mono text-xs">npm run seed:demo</code>.
          </li>
        ) : null}
        {!isLocalDev ? (
          <li>
            If your Clerk org is linked to this hostel, pick that org after
            sign-in.
          </li>
        ) : null}
      </ol>
      <p className="mt-4 text-sm text-(--color-muted)">
        Occupants (residents) do not use this flow — staff manage residents from
        the dashboard after you have access.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ClerkSignOutButton />
        {staffEntryHref ? (
          <ButtonLink href={staffEntryHref} variant="secondary" size="sm">
            Staff sign-in
          </ButtonLink>
        ) : (
          <ButtonLink href="/sign-in" variant="secondary" size="sm">
            Sign in
          </ButtonLink>
        )}
        <Link
          href="/"
          className="text-sm text-(--color-muted) hover:text-(--color-ink)"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
