import { Role } from "@vaikuntham/shared";
import {
  BedDouble,
  Building2,
  IndianRupee,
  LayoutDashboard,
  LayoutGrid,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { can, type Permission } from "@vaikuntham/shared";

export type NavSection = "ops" | "admin";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  /** Sidebar group — admin items require manageHostel / viewAudit. */
  section?: NavSection;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    section: "ops",
  },
  {
    href: "/dashboard/rooms",
    label: "Rooms & beds",
    icon: Building2,
    permission: "manageStructure",
    section: "ops",
  },
  {
    href: "/dashboard/occupancy",
    label: "Occupancy",
    icon: LayoutGrid,
    permission: "viewStructure",
    section: "ops",
  },
  {
    href: "/dashboard/residents",
    label: "Residents",
    icon: Users,
    permission: "manageResidents",
    section: "ops",
  },
  {
    href: "/dashboard/allotment",
    label: "Allotment",
    icon: BedDouble,
    permission: "manageAllotment",
    section: "ops",
  },
  {
    href: "/dashboard/fees",
    label: "Fees",
    icon: IndianRupee,
    permission: "managePayments",
    section: "ops",
  },
  {
    href: "/dashboard/audit",
    label: "Audit log",
    icon: ScrollText,
    permission: "viewAudit",
    section: "admin",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    permission: "manageHostel",
    section: "admin",
  },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.permission || can(role, item.permission),
  );
}

export type NavGroup = {
  section: NavSection;
  label: string;
  items: NavItem[];
};

export function navGroupsForRole(role: Role): NavGroup[] {
  const items = navForRole(role);
  const ops = items.filter((i) => (i.section ?? "ops") === "ops");
  const admin = items.filter((i) => i.section === "admin");
  const groups: NavGroup[] = [];
  if (ops.length > 0) {
    groups.push({ section: "ops", label: "Operations", items: ops });
  }
  if (admin.length > 0) {
    groups.push({ section: "admin", label: "Admin", items: admin });
  }
  return groups;
}
