import { Role } from "./enums";
import { z } from "zod";

export const createMembershipInviteSchema = z.object({
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  role: z.enum([Role.ADMIN, Role.WARDEN, Role.ACCOUNTANT]),
});

export type CreateMembershipInviteInput = z.infer<
  typeof createMembershipInviteSchema
>;

export type MembershipInviteDto = {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt?: string;
  acceptedAt?: string | null;
};
