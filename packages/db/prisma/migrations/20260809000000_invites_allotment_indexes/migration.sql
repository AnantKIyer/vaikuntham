-- MembershipInvite: invite-only provisioning (no auto-join)
CREATE TABLE "MembershipInvite" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WARDEN',
    "invitedById" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MembershipInvite_hostelId_email_key" ON "MembershipInvite"("hostelId", "email");
CREATE INDEX "MembershipInvite_email_idx" ON "MembershipInvite"("email");

ALTER TABLE "MembershipInvite" ADD CONSTRAINT "MembershipInvite_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One active allotment per bed and per resident (enforced before allotment API)
CREATE UNIQUE INDEX "Allotment_active_bed_key" ON "Allotment"("bedId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "Allotment_active_resident_key" ON "Allotment"("residentId") WHERE "status" = 'ACTIVE';
