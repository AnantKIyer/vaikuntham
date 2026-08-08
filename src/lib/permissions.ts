import { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  WARDEN: "Warden",
  ACCOUNTANT: "Accountant",
};

/** Permissions matrix for demo roles */
export const PERMISSIONS = {
  manageHostel: [Role.ADMIN],
  manageStructure: [Role.ADMIN, Role.WARDEN],
  manageResidents: [Role.ADMIN, Role.WARDEN],
  manageAllotment: [Role.ADMIN, Role.WARDEN],
  manageFeePlans: [Role.ADMIN, Role.ACCOUNTANT],
  managePayments: [Role.ADMIN, Role.ACCOUNTANT],
  viewReports: [Role.ADMIN, Role.WARDEN, Role.ACCOUNTANT],
  viewAudit: [Role.ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
