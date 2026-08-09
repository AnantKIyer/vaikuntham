import { BadRequestException } from "@nestjs/common";

export type AllotmentTenancyInput = {
  hostelId: string;
  residentHostelId: string;
  bedHostelId: string;
};

/** Ensures resident, bed, and session share one hostel before creating/updating an allotment. */
export function assertAllotmentTenancy(input: AllotmentTenancyInput): void {
  const { hostelId, residentHostelId, bedHostelId } = input;
  if (
    residentHostelId !== hostelId ||
    bedHostelId !== hostelId ||
    residentHostelId !== bedHostelId
  ) {
    throw new BadRequestException({
      ok: false,
      error: "Resident and bed must belong to the same hostel",
      code: "ALLOTMENT_TENANCY_MISMATCH",
    });
  }
}
