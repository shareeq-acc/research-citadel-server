-- Add username column (nullable first so existing rows don't fail)
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Backfill existing users with a temporary unique username derived from their email
UPDATE "User"
SET "username" = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-z0-9]', '', 'g'))
             || '_' || SUBSTRING(REPLACE(id::text, '-', ''), 1, 6)
WHERE "username" IS NULL;

-- Now enforce NOT NULL and UNIQUE
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE ("username");

-- Index for fast lookups
CREATE INDEX "User_username_idx" ON "User"("username");
