import { existsSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import type { NextConfig } from "next";

const rootEnv = resolve(__dirname, "../../.env");
if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@vaikuntham/shared"],
};

export default nextConfig;
