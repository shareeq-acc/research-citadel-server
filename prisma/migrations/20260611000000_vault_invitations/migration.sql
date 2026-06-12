CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

CREATE TABLE "VaultInvitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vaultId" UUID NOT NULL,
    "invitedUserId" UUID NOT NULL,
    "invitedBy" UUID NOT NULL,
    "role" "VaultRole" NOT NULL DEFAULT 'CONTRIBUTOR',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VaultInvitation_id_key" ON "VaultInvitation"("id");
CREATE UNIQUE INDEX "VaultInvitation_token_key" ON "VaultInvitation"("token");
CREATE UNIQUE INDEX "VaultInvitation_vaultId_invitedUserId_status_key"
    ON "VaultInvitation"("vaultId", "invitedUserId", "status")
    WHERE "status" = 'PENDING';

CREATE INDEX "VaultInvitation_vaultId_idx" ON "VaultInvitation"("vaultId");
CREATE INDEX "VaultInvitation_invitedUserId_idx" ON "VaultInvitation"("invitedUserId");
CREATE INDEX "VaultInvitation_token_idx" ON "VaultInvitation"("token");
CREATE INDEX "VaultInvitation_expiresAt_idx" ON "VaultInvitation"("expiresAt");

ALTER TABLE "VaultInvitation"
    ADD CONSTRAINT "VaultInvitation_vaultId_fkey"
    FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VaultInvitation"
    ADD CONSTRAINT "VaultInvitation_invitedUserId_fkey"
    FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VaultInvitation"
    ADD CONSTRAINT "VaultInvitation_invitedBy_fkey"
    FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
