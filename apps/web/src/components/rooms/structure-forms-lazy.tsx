"use client";

import dynamic from "next/dynamic";
import { FormSectionSkeleton } from "@/components/ui/page-skeletons";

export const CreateBlockForm = dynamic(
  () =>
    import("@/components/rooms/structure-forms").then((m) => ({
      default: m.CreateBlockForm,
    })),
  { loading: () => <FormSectionSkeleton /> },
);

export const CreateFloorForm = dynamic(
  () =>
    import("@/components/rooms/structure-forms").then((m) => ({
      default: m.CreateFloorForm,
    })),
  { loading: () => <FormSectionSkeleton /> },
);

export const BulkRoomsForm = dynamic(
  () =>
    import("@/components/rooms/structure-forms").then((m) => ({
      default: m.BulkRoomsForm,
    })),
  { loading: () => <FormSectionSkeleton /> },
);
