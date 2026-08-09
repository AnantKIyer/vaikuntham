import { SetMetadata } from "@nestjs/common";

/** Requires `Authorization: Bearer <HOSTEL_BOOTSTRAP_TOKEN>` — no membership session. */
export const BOOTSTRAP_KEY = "bootstrap";
export const Bootstrap = () => SetMetadata(BOOTSTRAP_KEY, true);
