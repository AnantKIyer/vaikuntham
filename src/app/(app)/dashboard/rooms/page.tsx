import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Rooms & beds" };

export default function RoomsPage() {
  return (
    <AppShell
      title="Rooms & beds"
      description="Blocks, floors, rooms, and bed status. CRUD ships in Week 2."
      actions={<Button disabled>Add block</Button>}
    >
      <EmptyState
        title="No structure yet"
        body="After Neon is connected, create blocks and bulk-generate rooms with beds."
      />
    </AppShell>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-12 text-center">
      <p className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
        {title}
      </p>
      <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">{body}</p>
    </div>
  );
}
