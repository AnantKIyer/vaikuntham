import {
  FEMALE_FIRST,
  MALE_FIRST,
  LAST_NAMES,
  ID_TYPES,
} from "./catalog.mjs";

/** Deterministic PRNG (mulberry32). */
export function createRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function bedCountForRoom(rng, pattern, roomIndex, floorLevel) {
  const n = roomIndex + floorLevel;
  switch (pattern) {
    case "singles":
      return rng() < 0.15 ? 2 : 1;
    case "doubles":
      return rng() < 0.1 ? 1 : rng() < 0.85 ? 2 : 3;
    case "mostly-triple":
      return rng() < 0.55 ? 3 : rng() < 0.75 ? 2 : 1;
    case "mixed":
    default: {
      const options = [1, 2, 2, 3, 3, 2, 1, 3];
      return options[n % options.length];
    }
  }
}

export function bedLabels(count) {
  return Array.from({ length: count }, (_, i) =>
    String.fromCharCode(65 + i),
  );
}

export function residentGender(genderHint, rng, blockName) {
  if (genderHint === "female") return "female";
  if (genderHint === "male") return "male";
  const blockLower = blockName.toLowerCase();
  if (blockLower.includes("girl")) return "female";
  if (blockLower.includes("boy")) return "male";
  return rng() < 0.5 ? "female" : "male";
}

export function makeResidentProfile(rng, gender, hostelSlug, seq) {
  const firstPool = gender === "female" ? FEMALE_FIRST : MALE_FIRST;
  const first = pick(rng, firstPool);
  const last = pick(rng, LAST_NAMES);
  const fullName = `${first} ${last}`;
  const phoneSuffix = String(1000000000 + Math.floor(rng() * 8999999999)).slice(-10);
  const idType = pick(rng, ID_TYPES);
  const idNumber =
    idType === "Aadhaar"
      ? `${Math.floor(rng() * 9000 + 1000)} ${Math.floor(rng() * 9000 + 1000)} ${Math.floor(rng() * 9000 + 1000)}`
      : idType === "PAN"
        ? `${pick(rng, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))}${pick(rng, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))}${pick(rng, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))}${pick(rng, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))}${pick(rng, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))}${Math.floor(rng() * 9000 + 1000)}${pick(rng, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))}`
        : `${Math.floor(rng() * 90000000 + 10000000)}`;

  const guardianFirst = pick(rng, gender === "female" ? MALE_FIRST : FEMALE_FIRST);
  const guardianLast = pick(rng, LAST_NAMES);

  return {
    fullName,
    phone: `+91 ${phoneSuffix.slice(0, 5)} ${phoneSuffix.slice(5)}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}.${seq}@${hostelSlug.replace(/-/g, "")}.demo`,
    idType,
    idNumber,
    guardianName: `${guardianFirst} ${guardianLast}`,
    guardianPhone: `+91 ${String(7000000000 + Math.floor(rng() * 2999999999)).slice(0, 5)} ${String(Math.floor(rng() * 90000 + 10000))}`,
    status: "ACTIVE",
  };
}

export function shuffle(rng, arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Staff names per hostel — warden + accountant with Indian names. */
export const STAFF_NAMES = [
  { warden: "Priya Sharma", accountant: "Ramesh Iyer" },
  { warden: "Kavitha Menon", accountant: "Suresh Patel" },
  { warden: "Anjali Gupta", accountant: "Vijay Rao" },
  { warden: "Deepa Nair", accountant: "Mohit Singh" },
  { warden: "Lakshmi Das", accountant: "Anil Kumar" },
  { warden: "Meena Joshi", accountant: "Sanjay Reddy" },
  { warden: "Padmini Iyer", accountant: "Gopal Verma" },
  { warden: "Sunita Bose", accountant: "Harish Malhotra" },
  { warden: "Geeta Chopra", accountant: "Prakash Desai" },
  { warden: "Uma Kulkarni", accountant: "Naveen Narayan" },
  { warden: "Radha Pillai", accountant: "Ashok Khan" },
  { warden: "Vani Reddy", accountant: "Kiran Sharma" },
  { warden: "Shalini Patel", accountant: "Manoj Gupta" },
  { warden: "Nandini Rao", accountant: "Ravi Menon" },
  { warden: "Swati Verma", accountant: "Dinesh Iyer" },
  { warden: "Rekha Singh", accountant: "Ajay Bose" },
];

export function staffUsernames(hostelSlug, role) {
  const short = hostelSlug.replace(/^demo-[abc]-/, "").replace(/-/g, "");
  return {
    username: `${role}_${short}`.slice(0, 48),
    email: `${role}.${short}@example.com`,
  };
}

export function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}
