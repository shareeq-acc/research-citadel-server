-- AlterTable
ALTER TABLE "VaultMember" ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{}';
