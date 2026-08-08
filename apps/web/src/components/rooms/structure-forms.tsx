"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  API_ROUTES,
  createBlockSchema,
  createFloorSchema,
  createRoomsBulkSchema,
  type ApiFailure,
} from "@vaikuntham/shared";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { useApiClient } from "@/lib/api/client";

type FloorOption = { id: string; label: string };
type BlockOption = { id: string; name: string };

type ActionResult = { ok: true } | ApiFailure;

function FormMessage({ result }: { result: ActionResult | null }) {
  if (!result || result.ok) return null;
  return <FieldError>{result.error}</FieldError>;
}

export function CreateBlockForm() {
  const router = useRouter();
  const api = useApiClient();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const parsed = createBlockSchema.safeParse({
            name: fd.get("name"),
            code: fd.get("code") || undefined,
            floorName: fd.get("floorName") || "Ground",
            floorLevel: fd.get("floorLevel") || 0,
          });
          if (!parsed.success) {
            setResult({
              ok: false,
              error: parsed.error.issues[0]?.message ?? "Invalid input",
            });
            return;
          }
          const res = await api(API_ROUTES.structure.blocks, {
            method: "POST",
            body: JSON.stringify(parsed.data),
          });
          setResult(res.ok ? { ok: true } : res);
          if (res.ok) router.refresh();
        });
      }}
    >
      <div>
        <Label htmlFor="block-name">Block name</Label>
        <Input
          id="block-name"
          name="name"
          required
          placeholder="e.g. A Wing"
          disabled={pending}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="block-code">Code (optional)</Label>
          <Input id="block-code" name="code" placeholder="A" disabled={pending} />
        </div>
        <div>
          <Label htmlFor="floor-name">First floor</Label>
          <Input
            id="floor-name"
            name="floorName"
            defaultValue="Ground"
            disabled={pending}
          />
        </div>
      </div>
      <FormMessage result={result} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Add block"}
      </Button>
    </form>
  );
}

export function CreateFloorForm({ blocks }: { blocks: BlockOption[] }) {
  const router = useRouter();
  const api = useApiClient();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  if (blocks.length === 0) return null;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const parsed = createFloorSchema.safeParse({
            blockId: fd.get("blockId"),
            name: fd.get("name"),
            level: fd.get("level") ?? 0,
          });
          if (!parsed.success) {
            setResult({
              ok: false,
              error: parsed.error.issues[0]?.message ?? "Invalid input",
            });
            return;
          }
          const res = await api(API_ROUTES.structure.floors, {
            method: "POST",
            body: JSON.stringify(parsed.data),
          });
          setResult(res.ok ? { ok: true } : res);
          if (res.ok) router.refresh();
        });
      }}
    >
      <div>
        <Label htmlFor="floor-block">Block</Label>
        <select
          id="floor-block"
          name="blockId"
          required
          disabled={pending}
          className="h-10 w-full rounded-md border border-(--color-border) bg-(--color-paper) px-3 text-sm"
          defaultValue={blocks[0]?.id}
        >
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="new-floor-name">Floor name</Label>
          <Input
            id="new-floor-name"
            name="name"
            required
            placeholder="First"
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="floor-level">Level</Label>
          <Input
            id="floor-level"
            name="level"
            type="number"
            defaultValue={1}
            disabled={pending}
          />
        </div>
      </div>
      <FormMessage result={result} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Adding…" : "Add floor"}
      </Button>
    </form>
  );
}

export function BulkRoomsForm({ floors }: { floors: FloorOption[] }) {
  const router = useRouter();
  const api = useApiClient();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  if (floors.length === 0) {
    return (
      <p className="text-sm text-(--color-muted)">
        Add a block (and floor) before bulk-creating rooms.
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const parsed = createRoomsBulkSchema.safeParse({
            floorId: fd.get("floorId"),
            roomStart: fd.get("roomStart"),
            roomCount: fd.get("roomCount"),
            bedsPerRoom: fd.get("bedsPerRoom"),
            prefix: fd.get("prefix") || undefined,
          });
          if (!parsed.success) {
            setResult({
              ok: false,
              error: parsed.error.issues[0]?.message ?? "Invalid input",
            });
            return;
          }
          const res = await api(API_ROUTES.structure.roomsBulk, {
            method: "POST",
            body: JSON.stringify(parsed.data),
          });
          setResult(res.ok ? { ok: true } : res);
          if (res.ok) router.refresh();
        });
      }}
    >
      <div>
        <Label htmlFor="bulk-floor">Floor</Label>
        <select
          id="bulk-floor"
          name="floorId"
          required
          disabled={pending}
          className="h-10 w-full rounded-md border border-(--color-border) bg-(--color-paper) px-3 text-sm"
          defaultValue={floors[0]?.id}
        >
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label htmlFor="prefix">Prefix</Label>
          <Input id="prefix" name="prefix" placeholder="A" disabled={pending} />
        </div>
        <div>
          <Label htmlFor="roomStart">Start #</Label>
          <Input
            id="roomStart"
            name="roomStart"
            type="number"
            defaultValue={101}
            min={1}
            required
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="roomCount">Rooms</Label>
          <Input
            id="roomCount"
            name="roomCount"
            type="number"
            defaultValue={10}
            min={1}
            max={100}
            required
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="bedsPerRoom">Beds/room</Label>
          <Input
            id="bedsPerRoom"
            name="bedsPerRoom"
            type="number"
            defaultValue={2}
            min={1}
            max={12}
            required
            disabled={pending}
          />
        </div>
      </div>
      <FormMessage result={result} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create rooms & beds"}
      </Button>
    </form>
  );
}
