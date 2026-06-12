-- VaultChatMember: tracks which vault members are in the chat channel
CREATE TABLE "VaultChatMember" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vaultId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "addedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultChatMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VaultChatMember_id_key" ON "VaultChatMember"("id");
CREATE UNIQUE INDEX "VaultChatMember_vaultId_userId_key" ON "VaultChatMember"("vaultId", "userId");
CREATE INDEX "VaultChatMember_vaultId_idx" ON "VaultChatMember"("vaultId");
CREATE INDEX "VaultChatMember_userId_idx" ON "VaultChatMember"("userId");

ALTER TABLE "VaultChatMember"
    ADD CONSTRAINT "VaultChatMember_vaultId_fkey"
    FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VaultChatMember"
    ADD CONSTRAINT "VaultChatMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VaultChatMessage: messages in a vault's chat channel
CREATE TABLE "VaultChatMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vaultId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "replyToId" UUID,
    "replyToText" TEXT,
    "replyToUser" TEXT,
    "readBy" UUID[] DEFAULT ARRAY[]::UUID[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VaultChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VaultChatMessage_id_key" ON "VaultChatMessage"("id");
CREATE INDEX "VaultChatMessage_vaultId_idx" ON "VaultChatMessage"("vaultId");
CREATE INDEX "VaultChatMessage_senderId_idx" ON "VaultChatMessage"("senderId");
CREATE INDEX "VaultChatMessage_createdAt_idx" ON "VaultChatMessage"("createdAt");

ALTER TABLE "VaultChatMessage"
    ADD CONSTRAINT "VaultChatMessage_vaultId_fkey"
    FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VaultChatMessage"
    ADD CONSTRAINT "VaultChatMessage_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
