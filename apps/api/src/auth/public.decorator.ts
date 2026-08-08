import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Skip auth — use only for health checks and similar. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
