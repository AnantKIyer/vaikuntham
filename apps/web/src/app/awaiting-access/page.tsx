import Link from "next/link";

export const metadata = { title: "Awaiting access" };

export default function AwaitingAccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <h1 className="font-display text-2xl text-(--color-ink)">
        Awaiting access
      </h1>
      <p className="mt-3 text-sm text-(--color-ink-soft)">
        Your Clerk account is not linked to this hostel yet. Ask an admin to
        invite your email, or sign in with the Clerk organization that matches
        your hostel.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/sign-in" className="text-(--color-accent) hover:underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
