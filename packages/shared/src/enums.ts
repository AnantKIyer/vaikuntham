/** Domain enums — kept Prisma-free so web never bundles @prisma/client. */
export const Role = {
  ADMIN: "ADMIN",
  WARDEN: "WARDEN",
  ACCOUNTANT: "ACCOUNTANT",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const BedStatus = {
  VACANT: "VACANT",
  OCCUPIED: "OCCUPIED",
  BLOCKED: "BLOCKED",
  MAINTENANCE: "MAINTENANCE",
} as const;

export type BedStatus = (typeof BedStatus)[keyof typeof BedStatus];

export const BED_STATUS_VALUES = [
  BedStatus.VACANT,
  BedStatus.OCCUPIED,
  BedStatus.BLOCKED,
  BedStatus.MAINTENANCE,
] as const;
