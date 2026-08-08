import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { isAuthDevBypass, isClerkConfigured } from "@/lib/utils";

export default function SignInPage() {
  if (isAuthDevBypass()) {
    redirect("/dashboard");
  }

  if (!isClerkConfigured()) {
    return (
      <SetupAuth
        title="Sign in"
        message="Add Clerk keys to .env, or set AUTH_DEV_BYPASS=true and NEXT_PUBLIC_AUTH_DEV_BYPASS=true for local UI without Clerk."
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SignIn />
    </div>
  );
}

function SetupAuth({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-md rounded-lg border border-(--color-border) bg-(--color-paper) p-6 text-center">
        <h1 className="font-display text-2xl text-(--color-ink)">
          {title}
        </h1>
        <p className="mt-3 text-sm text-(--color-muted)">{message}</p>
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
