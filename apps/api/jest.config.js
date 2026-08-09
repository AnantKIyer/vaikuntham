/** @type {import('jest').Config} */
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  setupFiles: ["<rootDir>/test/integration/setup-env.ts"],
  testRegex: "test/integration/.*\\.integration\\.spec\\.ts$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  testEnvironment: "node",
  testTimeout: 30_000,
};
