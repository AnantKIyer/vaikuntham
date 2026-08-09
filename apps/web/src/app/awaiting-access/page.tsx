import Link from "next/link";

export const metadata = { title: "Awaiting access" };

export default function AwaitingAccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <h1 className="font-display text-2xl text-(--color-ink)">
        Awaiting access
      </h1>
      <p className="mt-3 text-sm text-(--color-ink-soft)">
        Vaikuntham staff join by <strong>admin invite only</strong>. Your Clerk
        account is signed in, but you are not a member of this hostel yet.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-(--color-ink-soft)">
        <li>Ask the hostel owner or admin to invite your work email.</li>
        <li>
          Sign in with the Clerk organization linked to that hostel (your admin
          will share the org name).
        </li>
        <li>
          On first sign-in, a matching pending invite creates your membership
          automatically.
        </li>
      </ol>
      <p className="mt-4 text-sm text-(--color-muted)">
        Occupants (residents) do not use this flow — staff manage residents from
        the dashboard after you have access.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/sign-in" className="text-(--color-accent) hover:underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
