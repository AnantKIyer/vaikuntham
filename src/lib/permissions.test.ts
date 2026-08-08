/**
 * Permission matrix smoke test — run: npx tsx src/lib/permissions.test.ts
 */
import { Role } from "@prisma/client";
import { can } from "./permissions";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(can(Role.ADMIN, "manageFeePlans"), "admin manages fees");
assert(can(Role.ADMIN, "viewAudit"), "admin views audit");
assert(can(Role.WARDEN, "manageAllotment"), "warden allotment");
assert(!can(Role.WARDEN, "manageFeePlans"), "warden cannot fee plans");
assert(!can(Role.WARDEN, "viewAudit"), "warden cannot audit");
assert(can(Role.ACCOUNTANT, "managePayments"), "accountant payments");
assert(!can(Role.ACCOUNTANT, "manageResidents"), "accountant no residents");
assert(can(Role.ACCOUNTANT, "viewReports"), "accountant reports");

console.log("permissions.test.ts: all assertions passed");
