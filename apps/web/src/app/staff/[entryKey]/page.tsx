import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { isValidAdminEntryKey } from "@/lib/admin-entry";
import { isAuthDevBypass, isClerkConfigured } from "@/lib/utils";

export const metadata = { title: "Staff entry" };

export default async function StaffEntryPage({
  params,
}: {
  params: Promise<{ entryKey: string }>;
}) {
  const { entryKey } = await params;

  if (!isValidAdminEntryKey(entryKey)) {
    notFound();
  }

  if (isAuthDevBypass()) {
    redirect("/dashboard");
  }

  if (!isClerkConfigured()) {
    redirect("/sign-in");
  }

  const { userId } = await auth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 max-w-md text-center">
        <p className="font-display text-2xl text-(--color-ink)">Staff entry</p>
        <p className="mt-2 text-sm text-(--color-ink-soft)">
          Hostel operators only. Sign in with your invited account or admin
          credentials provisioned for this environment.
        </p>
      </div>
      <SignInPanel isSignedIn={Boolean(userId)} routing="hash" />
    </div>
  );
}
