import { BedStatus } from "./enums";
import { z } from "zod";

export const createBlockSchema = z.object({
  name: z.string().trim().min(1).max(80),
  code: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : undefined)),
  floorName: z.string().trim().min(1).max(80).default("Ground"),
  floorLevel: z.coerce.number().int().min(-5).max(100).default(0),
});

export const createFloorSchema = z.object({
  blockId: z.string().cuid(),
  name: z.string().trim().min(1).max(80),
  level: z.coerce.number().int().min(-5).max(100).default(0),
});

export const createRoomsBulkSchema = z.object({
  floorId: z.string().cuid(),
  roomStart: z.coerce.number().int().min(1).max(9999),
  roomCount: z.coerce.number().int().min(1).max(100),
  bedsPerRoom: z.coerce.number().int().min(1).max(12),
  prefix: z
    .string()
    .trim()
    .max(10)
    .optional()
    .transform((v) => (v ? v : "")),
});

/** Admin-settable only — OCCUPIED comes from allotment. */
export const setBedStatusSchema = z.object({
  status: z.enum([
    BedStatus.VACANT,
    BedStatus.BLOCKED,
    BedStatus.MAINTENANCE,
  ] as const),
});

export const renameBedSchema = z.object({
  label: z.string().trim().min(1).max(20),
});

export const bulkDeleteBedsSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
});

export const bulkRenameBedsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().cuid(),
        label: z.string().trim().min(1).max(20),
      }),
    )
    .min(1)
    .max(100),
});

export const renameRoomSchema = z.object({
  number: z.string().trim().min(1).max(20),
});

export const renameFloorSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const renameBlockSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  code: z
    .string()
    .trim()
    .max(20)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
});

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type CreateFloorInput = z.infer<typeof createFloorSchema>;
export type CreateRoomsBulkInput = z.infer<typeof createRoomsBulkSchema>;
export type SetBedStatusInput = z.infer<typeof setBedStatusSchema>;
export type RenameBedInput = z.infer<typeof renameBedSchema>;
export type BulkDeleteBedsInput = z.infer<typeof bulkDeleteBedsSchema>;
export type BulkRenameBedsInput = z.infer<typeof bulkRenameBedsSchema>;
export type RenameRoomInput = z.infer<typeof renameRoomSchema>;
export type RenameFloorInput = z.infer<typeof renameFloorSchema>;
export type RenameBlockInput = z.infer<typeof renameBlockSchema>;
