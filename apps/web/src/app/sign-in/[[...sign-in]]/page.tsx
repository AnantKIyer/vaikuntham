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
        title="Set up Clerk sign-in"
        steps={[
          "Open dashboard.clerk.com → your app → API Keys.",
          "Copy Publishable key (pk_test_…) and Secret key (sk_test_…).",
          "Add to root .env: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.",
          "Ensure AUTH_DEV_BYPASS=false and NEXT_PUBLIC_AUTH_DEV_BYPASS=false.",
          "Restart npm run dev:fast, then reload this page.",
        ]}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SignIn />
    </div>
  );
}

function SetupAuth({
  title,
  steps,
}: {
  title: string;
  steps: string[];
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-md rounded-lg border border-(--color-border) bg-(--color-paper) p-6">
        <h1 className="font-display text-2xl text-(--color-ink)">{title}</h1>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-(--color-ink-soft)">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
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
