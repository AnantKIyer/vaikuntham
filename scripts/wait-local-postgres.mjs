#!/usr/bin/env node
import { execSync } from "node:child_process";

const maxAttempts = 30;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    execSync(
      "docker compose exec -T postgres pg_isready -U postgres -d vaikuntham",
      { stdio: "pipe" },
    );
    console.log("Local Postgres is ready.");
    process.exit(0);
  } catch {
    if (attempt === maxAttempts) {
      console.error("Timed out waiting for local Postgres.");
      process.exit(1);
    }
    execSync("sleep 1");
  }
}
