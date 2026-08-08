import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { isAuthDevBypass, isClerkConfigured } from "@/lib/utils";

export default function SignUpPage() {
  if (isAuthDevBypass()) {
    redirect("/dashboard");
  }

  if (!isClerkConfigured()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="max-w-md rounded-lg border border-(--color-border) bg-(--color-paper) p-6 text-center">
          <h1 className="font-display text-2xl text-(--color-ink)">Sign up</h1>
          <p className="mt-3 text-sm text-(--color-muted)">
            Add Clerk keys to .env to enable registration, or use both auth
            bypass flags for local UI review.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-(--color-accent) underline-offset-2 hover:underline"
          >
            Back to home
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
