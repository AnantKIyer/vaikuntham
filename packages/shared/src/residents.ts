import { z } from "zod";
import { ResidentStatus, RESIDENT_STATUS_VALUES } from "./enums";

function emptyToUndefined(v: unknown) {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
}

export const createResidentSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(120),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  email: z.preprocess(
    emptyToUndefined,
    z.string().trim().email("Invalid email").optional(),
  ),
  idType: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  idNumber: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(80).optional(),
  ),
  guardianName: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  guardianPhone: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(40).optional(),
  ),
  status: z.enum(RESIDENT_STATUS_VALUES).optional(),
});

export const updateResidentSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(40).nullable().optional(),
  ),
  email: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().email("Invalid email").nullable().optional(),
  ),
  idType: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(40).nullable().optional(),
  ),
  idNumber: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(80).nullable().optional(),
  ),
  guardianName: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(120).nullable().optional(),
  ),
  guardianPhone: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().max(40).nullable().optional(),
  ),
  status: z.enum(RESIDENT_STATUS_VALUES).optional(),
});

export type CreateResidentInput = z.infer<typeof createResidentSchema>;
export type UpdateResidentInput = z.infer<typeof updateResidentSchema>;

export type ResidentDto = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  idType: string | null;
  idNumber: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  status: ResidentStatus;
  createdAt: string;
  activeAllotment: {
    id: string;
    bedLabel: string;
    roomNumber: string;
    blockName: string;
  } | null;
};

export type ResidentsListDto = {
  total: number;
  residents: ResidentDto[];
};
