import { Role } from "@prisma/client";
import {
  BedDouble,
  Building2,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { can, type Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** If set, user must have this permission to see the item */
  permission?: Permission;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/dashboard/rooms",
    label: "Rooms & beds",
    icon: Building2,
    permission: "manageStructure",
  },
  {
    href: "/dashboard/residents",
    label: "Residents",
    icon: Users,
    permission: "manageResidents",
  },
  {
    href: "/dashboard/allotment",
    label: "Allotment",
    icon: BedDouble,
    permission: "manageAllotment",
  },
  {
    href: "/dashboard/fees",
    label: "Fees",
    icon: Receipt,
    permission: "managePayments",
  },
  {
    href: "/dashboard/audit",
    label: "Audit log",
    icon: ScrollText,
    permission: "viewAudit",
  },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.permission || can(role, item.permission),
  );
}
