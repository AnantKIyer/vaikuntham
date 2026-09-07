export const API_PREFIX = "/v1";

export const API_ROUTES = {
  health: "/health",
  session: `${API_PREFIX}/session`,
  settings: `${API_PREFIX}/settings`,
  audit: `${API_PREFIX}/audit`,
  memberships: {
    root: `${API_PREFIX}/memberships`,
    member: (id: string) => `${API_PREFIX}/memberships/${id}`,
    invites: `${API_PREFIX}/memberships/invites`,
    invite: (id: string) => `${API_PREFIX}/memberships/invites/${id}`,
  },
  hostels: {
    root: `${API_PREFIX}/hostels`,
    linkOrg: (hostelId: string) =>
      `${API_PREFIX}/hostels/${hostelId}/link-org`,
  },
  dashboard: {
    stats: `${API_PREFIX}/dashboard/stats`,
    activity: `${API_PREFIX}/dashboard/activity`,
  },
  structure: {
    blocks: `${API_PREFIX}/structure/blocks`,
    floors: `${API_PREFIX}/structure/floors`,
    roomsBulk: `${API_PREFIX}/structure/rooms/bulk`,
    beds: `${API_PREFIX}/structure/beds`,
    bedsDelete: `${API_PREFIX}/structure/beds/delete`,
    bedsRename: `${API_PREFIX}/structure/beds/rename`,
    board: `${API_PREFIX}/structure/board`,
    occupancy: `${API_PREFIX}/structure/occupancy`,
    bed: (bedId: string) => `${API_PREFIX}/structure/beds/${bedId}`,
    bedStatus: (bedId: string) => `${API_PREFIX}/structure/beds/${bedId}/status`,
    room: (roomId: string) => `${API_PREFIX}/structure/rooms/${roomId}`,
    floor: (floorId: string) => `${API_PREFIX}/structure/floors/${floorId}`,
    block: (blockId: string) => `${API_PREFIX}/structure/blocks/${blockId}`,
  },
  residents: {
    root: `${API_PREFIX}/residents`,
    one: (id: string) => `${API_PREFIX}/residents/${id}`,
    history: (id: string) => `${API_PREFIX}/residents/${id}/history`,
  },
  allotments: {
    root: `${API_PREFIX}/allotments`,
    end: (id: string) => `${API_PREFIX}/allotments/${id}/end`,
    transfer: `${API_PREFIX}/allotments/transfer`,
    vacate: `${API_PREFIX}/allotments/vacate`,
  },
  fees: {
    plans: `${API_PREFIX}/fees/plans`,
    invoices: `${API_PREFIX}/fees/invoices`,
    generateInvoice: `${API_PREFIX}/fees/invoices/generate`,
    invoice: (id: string) => `${API_PREFIX}/fees/invoices/${id}`,
    voidInvoice: (id: string) => `${API_PREFIX}/fees/invoices/${id}/void`,
    summary: `${API_PREFIX}/fees/summary`,
    billingResidents: `${API_PREFIX}/fees/billing-residents`,
  },
  payments: {
    root: `${API_PREFIX}/payments`,
    dues: `${API_PREFIX}/payments/dues`,
    one: (id: string) => `${API_PREFIX}/payments/${id}`,
  },
} as const;
