import { z } from "zod";
import type { AllotmentStatus } from "./enums";

export const assignAllotmentSchema = z.object({
  residentId: z.string().min(1),
  bedId: z.string().min(1),
  notes: z.string().trim().max(500).optional(),
});

export const endAllotmentSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export const transferAllotmentSchema = z.object({
  allotmentId: z.string().min(1),
  toBedId: z.string().min(1),
  notes: z.string().trim().max(500).optional(),
});

export const vacateResidentSchema = z.object({
  residentId: z.string().min(1),
  notes: z.string().trim().max(500).optional(),
  /** Required when openDuesPaise > 0 (fees module). */
  acknowledgeDues: z.boolean().optional(),
});

export type AssignAllotmentInput = z.infer<typeof assignAllotmentSchema>;
export type EndAllotmentInput = z.infer<typeof endAllotmentSchema>;
export type TransferAllotmentInput = z.infer<typeof transferAllotmentSchema>;
export type VacateResidentInput = z.infer<typeof vacateResidentSchema>;

export type AllotmentDto = {
  id: string;
  status: AllotmentStatus;
  startAt: string;
  endAt: string | null;
  notes: string | null;
  resident: { id: string; fullName: string; status: string };
  bed: {
    id: string;
    label: string;
    status: string;
    roomNumber: string;
    floorName: string;
    blockName: string;
  };
};

export type AllotmentsListDto = {
  allotments: AllotmentDto[];
};

export type VacateResultDto = {
  allotment: AllotmentDto | null;
  residentId: string;
  openDuesPaise: number;
};

export type OccupancyBedDto = {
  id: string;
  label: string;
  status: string;
  roomNumber: string;
  floorId: string;
  floorName: string;
  blockId: string;
  blockName: string;
  resident: { id: string; fullName: string } | null;
};

export type OccupancyFloorDto = {
  id: string;
  name: string;
  level: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyPercent: number;
  beds: OccupancyBedDto[];
};

export type OccupancyBlockDto = {
  id: string;
  name: string;
  code: string | null;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyPercent: number;
  floors: OccupancyFloorDto[];
};

export type OccupancyBoardDto = {
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyPercent: number;
  blocks: OccupancyBlockDto[];
};
