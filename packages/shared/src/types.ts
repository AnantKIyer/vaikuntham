import type { Role } from "./enums";

export type SessionContext = {
  userId: string;
  hostelId: string;
  role: Role;
  email?: string | null;
  fullName?: string | null;
  hostelName?: string | null;
};

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: string; code?: string };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/** Page payload: domain data plus session (one HTTP call from web). */
export type PageWithSession<T> = T & { session: SessionContext };

export type BlockTree = {
  id: string;
  name: string;
  code: string | null;
  floors: Array<{
    id: string;
    name: string;
    level: number;
    roomCount: number;
  }>;
};

export type BedRowDto = {
  id: string;
  label: string;
  status: string;
  roomNumber: string;
  floorName: string;
  blockName: string;
};

export type BedsListDto = {
  beds: BedRowDto[];
  totalBeds: number;
};

export type RoomsBoardDto = {
  blocks: BlockTree[];
  beds: BedRowDto[];
  totalBeds: number;
};

export type HostelSettingsDto = {
  hostel: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    clerkOrgId: string | null;
  };
  members: Array<{
    id: string;
    clerkUserId: string;
    role: Role;
    createdAt: string;
  }>;
};

export type AuditLogDto = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  createdAt: string;
};
