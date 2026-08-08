export const API_PREFIX = "/v1";

export const API_ROUTES = {
  health: "/health",
  session: `${API_PREFIX}/session`,
  settings: `${API_PREFIX}/settings`,
  audit: `${API_PREFIX}/audit`,
  memberships: {
    invites: `${API_PREFIX}/memberships/invites`,
  },
  dashboard: {
    stats: `${API_PREFIX}/dashboard/stats`,
  },
  structure: {
    blocks: `${API_PREFIX}/structure/blocks`,
    floors: `${API_PREFIX}/structure/floors`,
    roomsBulk: `${API_PREFIX}/structure/rooms/bulk`,
    beds: `${API_PREFIX}/structure/beds`,
    board: `${API_PREFIX}/structure/board`,
    bedStatus: (bedId: string) => `${API_PREFIX}/structure/beds/${bedId}/status`,
  },
} as const;
