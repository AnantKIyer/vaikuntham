import Link from "next/link";

export const metadata = { title: "No permission" };

export default function NoPermissionPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <h1 className="font-display text-2xl text-(--color-ink)">
        No permission
      </h1>
      <p className="mt-3 text-sm text-(--color-ink-soft)">
        You are signed in, but your role cannot open that page. Contact an admin
        if you need a different role.
      </p>
      <p className="mt-6 text-sm">
        <Link
          href="/dashboard"
          className="text-(--color-accent) hover:underline"
        >
          Back to dashboard
        </Link>
      </p>
    </main>
  );
}
