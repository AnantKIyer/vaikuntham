import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase alphanumeric with hyphens",
  );

export const createHostelSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  address: z.string().trim().max(240).optional().nullable(),
  /** Optional Clerk organization id (org_...). Can also be set via link-org. */
  clerkOrgId: z
    .string()
    .trim()
    .regex(/^org_[\w-]+$/, "clerkOrgId must look like org_…")
    .optional()
    .nullable(),
});

export type CreateHostelInput = z.infer<typeof createHostelSchema>;

export const linkHostelOrgSchema = z.object({
  clerkOrgId: z
    .string()
    .trim()
    .regex(/^org_[\w-]+$/, "clerkOrgId must look like org_…"),
});

export type LinkHostelOrgInput = z.infer<typeof linkHostelOrgSchema>;

export type HostelDto = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  clerkOrgId: string | null;
  createdAt: string;
};
