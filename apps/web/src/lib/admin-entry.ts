import { existsSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

/** Monorepo root `.env` — Next may not expose new keys until restart. */
function ensureRootEnv() {
  const rootEnv = resolve(process.cwd(), "../../.env");
  if (existsSync(rootEnv)) {
    config({ path: rootEnv, override: false });
  }
}

/** Unlisted staff entry — `/staff/<ADMIN_ENTRY_KEY>`. Wrong key → 404. */
export function isValidAdminEntryKey(key: string): boolean {
  ensureRootEnv();
  const expected = process.env.ADMIN_ENTRY_KEY?.trim();
  if (!expected || expected.length < 8) return false;
  return key === expected;
}

export function adminEntryPath(): string | null {
  ensureRootEnv();
  const expected = process.env.ADMIN_ENTRY_KEY?.trim();
  if (!expected || expected.length < 8) return null;
  return `/staff/${expected}`;
}
