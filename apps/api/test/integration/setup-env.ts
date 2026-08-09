import { existsSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

const rootEnv = resolve(__dirname, "../../../.env");
if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}
