import { Role } from "./enums";
import { can, PERMISSIONS, ROLE_LABELS, type Permission } from "./permissions";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    failed += 1;
  } else {
    console.log("OK:", message);
  }
}

assert(can(Role.ADMIN, "manageStructure"), "admin can manage structure");
assert(can(Role.WARDEN, "manageStructure"), "warden can manage structure");
assert(!can(Role.ACCOUNTANT, "manageStructure"), "accountant cannot manage structure");
assert(can(Role.ADMIN, "viewAudit"), "admin can view audit");
assert(!can(Role.WARDEN, "viewAudit"), "warden cannot view audit");
assert(Object.keys(PERMISSIONS).length >= 8, "permissions matrix populated");
assert(ROLE_LABELS[Role.ADMIN] === "Admin", "role labels defined");

if (failed > 0) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("All permission smoke tests passed");

export type { Permission };
