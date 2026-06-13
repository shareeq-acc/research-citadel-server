-- DropIndex
DROP INDEX "VaultInvitation_vaultId_invitedUserId_status_key";

-- AlterTable
ALTER TABLE "VaultChatMember" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VaultChatMessage" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VaultInvitation" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "VaultPassport" (
    "id" UUID NOT NULL,
    "vaultId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "vaultAlias" TEXT,
    "role" TEXT,
    "motto" TEXT,
    "barcode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultPassport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VaultPassport_id_key" ON "VaultPassport"("id");

-- CreateIndex
CREATE UNIQUE INDEX "VaultPassport_barcode_key" ON "VaultPassport"("barcode");

-- CreateIndex
CREATE INDEX "VaultPassport_vaultId_idx" ON "VaultPassport"("vaultId");

-- CreateIndex
CREATE INDEX "VaultPassport_userId_idx" ON "VaultPassport"("userId");

-- CreateIndex
CREATE INDEX "VaultPassport_barcode_idx" ON "VaultPassport"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "VaultPassport_vaultId_userId_key" ON "VaultPassport"("vaultId", "userId");

-- AddForeignKey
ALTER TABLE "VaultPassport" ADD CONSTRAINT "VaultPassport_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultPassport" ADD CONSTRAINT "VaultPassport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
