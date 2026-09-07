/**
 * Prisma seed entry — full demo dataset via scripts/seed-demo-data.mjs
 *
 *   npm run seed:demo
 *   npm run seed:demo:reset
 */
async function main() {
  console.log(
    "Run `npm run seed:demo` for the full dataset (3 owners, 16 hostels, residents, staff).\n" +
      "Use `npm run seed:demo:reset` to wipe demo-a/b/c hostels and re-seed.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
