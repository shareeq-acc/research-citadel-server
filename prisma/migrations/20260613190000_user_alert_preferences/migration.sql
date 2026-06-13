-- AlterTable
ALTER TABLE "User" ADD COLUMN "alertPreferences" JSONB NOT NULL DEFAULT '{}';
