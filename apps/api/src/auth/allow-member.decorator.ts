import { SetMetadata } from "@nestjs/common";

export const ALLOW_MEMBER_KEY = "allowMember";

/** Any authenticated hostel member (no specific permission required). */
export const AllowMember = () => SetMetadata(ALLOW_MEMBER_KEY, true);
