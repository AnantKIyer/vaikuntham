#!/usr/bin/env node
/**
 * Ops helper (CB-151): create a hostel and optionally link a Clerk org.
 *
 * Usage:
 *   node scripts/bootstrap-hostel.mjs --name "Green Valley" [--slug green-valley] [--org org_xxx]
 *
 * Env:
 *   API_URL                 default http://localhost:3001
 *   HOSTEL_BOOTSTRAP_TOKEN  required (Bearer)
 */

const API_URL = (process.env.API_URL ?? "http://localhost:3001").replace(
  /\/$/,
  "",
);
const TOKEN = process.env.HOSTEL_BOOTSTRAP_TOKEN?.trim();

function usage() {
  console.error(`Usage:
  HOSTEL_BOOTSTRAP_TOKEN=... node scripts/bootstrap-hostel.mjs \\
    --name "Hostel Name" [--slug my-slug] [--org org_xxx] [--address "..."]`);
  process.exit(1);
}

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main() {
  if (!TOKEN) {
    console.error("HOSTEL_BOOTSTRAP_TOKEN is required");
    usage();
  }

  const name = arg("--name");
  if (!name) usage();

  const slug = arg("--slug");
  const address = arg("--address");
  const org = arg("--org");

  const createBody = {
    name,
    ...(slug ? { slug } : {}),
    ...(address ? { address } : {}),
    ...(org ? { clerkOrgId: org } : {}),
  };

  const createRes = await fetch(`${API_URL}/v1/hostels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createBody),
  });
  const createJson = await createRes.json();
  if (!createRes.ok) {
    console.error("Create failed:", createRes.status, createJson);
    process.exit(1);
  }

  console.log("Created hostel:", createJson.data);

  if (org && !createJson.data.clerkOrgId) {
    const linkRes = await fetch(
      `${API_URL}/v1/hostels/${createJson.data.id}/link-org`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clerkOrgId: org }),
      },
    );
    const linkJson = await linkRes.json();
    if (!linkRes.ok) {
      console.error("Link-org failed:", linkRes.status, linkJson);
      process.exit(1);
    }
    console.log("Linked org:", linkJson.data);
  }

  console.log(`
Next:
  1. Create a Clerk organization matching clerkOrgId (or use the id above).
  2. Sign in as the first user in that org → they become ADMIN.
  3. Invite additional staff via Settings / POST /v1/memberships/invites.
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
