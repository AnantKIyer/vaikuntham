import { existsSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

/** Monorepo root .env (works from apps/api/dist at runtime). */
const rootEnv = resolve(__dirname, "../../../.env");
if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}

/** Optional app-local overrides. */
const localEnv = resolve(__dirname, "../.env");
if (existsSync(localEnv)) {
  config({ path: localEnv, override: true });
}
