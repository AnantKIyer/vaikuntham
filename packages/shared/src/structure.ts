import { BED_STATUS_VALUES } from "./enums";
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

export const setBedStatusSchema = z.object({
  status: z.enum(BED_STATUS_VALUES),
});

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type CreateFloorInput = z.infer<typeof createFloorSchema>;
export type CreateRoomsBulkInput = z.infer<typeof createRoomsBulkSchema>;
export type SetBedStatusInput = z.infer<typeof setBedStatusSchema>;
