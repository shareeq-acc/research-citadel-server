-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "aiInsights" JSONB,
ADD COLUMN     "aiProcessedAt" TIMESTAMP(3),
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "extractedMetadata" JSONB,
ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "textExtractedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SourceChunk" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "vaultId" UUID NOT NULL,
    "chunkText" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "pageNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceChunk_id_key" ON "SourceChunk"("id");

-- CreateIndex
CREATE INDEX "SourceChunk_sourceId_idx" ON "SourceChunk"("sourceId");

-- CreateIndex
CREATE INDEX "SourceChunk_vaultId_idx" ON "SourceChunk"("vaultId");

-- CreateIndex
CREATE INDEX "SourceChunk_chunkIndex_idx" ON "SourceChunk"("chunkIndex");

-- AddForeignKey
ALTER TABLE "SourceChunk" ADD CONSTRAINT "SourceChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
