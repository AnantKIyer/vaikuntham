export const API_PREFIX = "/v1";

export const API_ROUTES = {
  health: "/health",
  session: `${API_PREFIX}/session`,
  settings: `${API_PREFIX}/settings`,
  audit: `${API_PREFIX}/audit`,
  memberships: {
    invites: `${API_PREFIX}/memberships/invites`,
  },
  hostels: {
    root: `${API_PREFIX}/hostels`,
    linkOrg: (hostelId: string) =>
      `${API_PREFIX}/hostels/${hostelId}/link-org`,
  },
  dashboard: {
    stats: `${API_PREFIX}/dashboard/stats`,
  },
  structure: {
    blocks: `${API_PREFIX}/structure/blocks`,
    floors: `${API_PREFIX}/structure/floors`,
    roomsBulk: `${API_PREFIX}/structure/rooms/bulk`,
    beds: `${API_PREFIX}/structure/beds`,
    bedsDelete: `${API_PREFIX}/structure/beds/delete`,
    bedsRename: `${API_PREFIX}/structure/beds/rename`,
    board: `${API_PREFIX}/structure/board`,
    bed: (bedId: string) => `${API_PREFIX}/structure/beds/${bedId}`,
    bedStatus: (bedId: string) => `${API_PREFIX}/structure/beds/${bedId}/status`,
    room: (roomId: string) => `${API_PREFIX}/structure/rooms/${roomId}`,
    floor: (floorId: string) => `${API_PREFIX}/structure/floors/${floorId}`,
    block: (blockId: string) => `${API_PREFIX}/structure/blocks/${blockId}`,
  },
} as const;
