"use client";

import dynamic from "next/dynamic";
import { TableSkeleton } from "@/components/ui/page-skeletons";
import type { BedRow } from "@/components/rooms/bed-status-select";

export const BedsTable = dynamic(
  () =>
    import("@/components/rooms/beds-table").then((m) => ({
      default: m.BedsTable,
    })),
  { loading: () => <TableSkeleton rows={6} /> },
);

export type { BedRow };
