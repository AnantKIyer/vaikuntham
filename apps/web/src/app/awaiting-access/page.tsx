import { AwaitingAccessPanel } from "@/components/auth/awaiting-access-panel";
import { adminEntryPath } from "@/lib/admin-entry";

export const metadata = { title: "Awaiting access" };

export default function AwaitingAccessPage() {
  const isLocalDev = process.env.NODE_ENV === "development";
  return (
    <AwaitingAccessPanel
      staffEntryHref={adminEntryPath() ?? undefined}
      isLocalDev={isLocalDev}
    />
  );
}
