-- CreateEnum
CREATE TYPE "VaultPrivacy" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "VaultRole" AS ENUM ('OWNER', 'CONTRIBUTOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PDF', 'DOCX', 'IMAGE', 'VIDEO', 'DATASET', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('PDF', 'WEB_ARTICLE', 'DATASET', 'VIDEO', 'BOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('CITES', 'CITED_BY', 'CONTRADICTS', 'SUPPORTS', 'EXTENDS', 'RELATES_TO');

-- CreateEnum
CREATE TYPE "CitationFormat" AS ENUM ('APA', 'MLA', 'CHICAGO', 'HARVARD', 'IEEE', 'BIBTEX');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('VAULT_CREATED', 'VAULT_UPDATED', 'VAULT_DELETED', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'MEMBER_ROLE_CHANGED', 'FILE_UPLOADED', 'FILE_DELETED', 'SOURCE_ADDED', 'SOURCE_UPDATED', 'SOURCE_DELETED', 'ANNOTATION_ADDED', 'ANNOTATION_UPDATED', 'ANNOTATION_DELETED', 'RELATIONSHIP_CREATED', 'RELATIONSHIP_DELETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RateLimitAction" ADD VALUE 'FILE_UPLOAD';
ALTER TYPE "RateLimitAction" ADD VALUE 'SOURCE_CREATE';

-- CreateTable
CREATE TABLE "Vault" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "privacy" "VaultPrivacy" NOT NULL DEFAULT 'PRIVATE',
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Vault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultMember" (
    "id" UUID NOT NULL,
    "vaultId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "VaultRole" NOT NULL,
    "invitedBy" UUID,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" UUID NOT NULL,
    "vaultId" UUID NOT NULL,
    "uploadedBy" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileMimeType" TEXT NOT NULL,
    "fileType" "FileType" NOT NULL,
    "pageCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" UUID NOT NULL,
    "vaultId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publication" TEXT,
    "year" INTEGER,
    "externalUrl" TEXT,
    "sourceType" "SourceType" NOT NULL DEFAULT 'PDF',
    "fileId" UUID,
    "aiExtracted" BOOLEAN NOT NULL DEFAULT false,
    "abstract" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRelationship" (
    "id" UUID NOT NULL,
    "sourceAId" UUID NOT NULL,
    "sourceBId" UUID NOT NULL,
    "relationship" "RelationshipType" NOT NULL,
    "createdBy" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "vaultId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "pageReference" INTEGER,
    "sectionReference" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitationReference" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "format" "CitationFormat" NOT NULL,
    "citation" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CitationReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultTag" (
    "id" UUID NOT NULL,
    "vaultId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceTag" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "vaultId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT,
    "entityId" UUID,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileLock" (
    "id" UUID NOT NULL,
    "vaultId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "lockedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnotationLock" (
    "id" UUID NOT NULL,
    "annotationId" UUID NOT NULL,
    "lockedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnotationLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vault_id_key" ON "Vault"("id");

-- CreateIndex
CREATE INDEX "Vault_ownerId_idx" ON "Vault"("ownerId");

-- CreateIndex
CREATE INDEX "Vault_createdAt_idx" ON "Vault"("createdAt");

-- CreateIndex
CREATE INDEX "Vault_name_idx" ON "Vault"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VaultMember_id_key" ON "VaultMember"("id");

-- CreateIndex
CREATE INDEX "VaultMember_vaultId_idx" ON "VaultMember"("vaultId");

-- CreateIndex
CREATE INDEX "VaultMember_userId_idx" ON "VaultMember"("userId");

-- CreateIndex
CREATE INDEX "VaultMember_role_idx" ON "VaultMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "VaultMember_vaultId_userId_key" ON "VaultMember"("vaultId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "File_id_key" ON "File"("id");

-- CreateIndex
CREATE INDEX "File_vaultId_idx" ON "File"("vaultId");

-- CreateIndex
CREATE INDEX "File_uploadedBy_idx" ON "File"("uploadedBy");

-- CreateIndex
CREATE INDEX "File_fileType_idx" ON "File"("fileType");

-- CreateIndex
CREATE INDEX "File_createdAt_idx" ON "File"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Source_id_key" ON "Source"("id");

-- CreateIndex
CREATE INDEX "Source_vaultId_idx" ON "Source"("vaultId");

-- CreateIndex
CREATE INDEX "Source_createdBy_idx" ON "Source"("createdBy");

-- CreateIndex
CREATE INDEX "Source_fileId_idx" ON "Source"("fileId");

-- CreateIndex
CREATE INDEX "Source_sourceType_idx" ON "Source"("sourceType");

-- CreateIndex
CREATE INDEX "Source_createdAt_idx" ON "Source"("createdAt");

-- CreateIndex
CREATE INDEX "Source_title_idx" ON "Source"("title");

-- CreateIndex
CREATE UNIQUE INDEX "SourceRelationship_id_key" ON "SourceRelationship"("id");

-- CreateIndex
CREATE INDEX "SourceRelationship_sourceAId_idx" ON "SourceRelationship"("sourceAId");

-- CreateIndex
CREATE INDEX "SourceRelationship_sourceBId_idx" ON "SourceRelationship"("sourceBId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceRelationship_sourceAId_sourceBId_relationship_key" ON "SourceRelationship"("sourceAId", "sourceBId", "relationship");

-- CreateIndex
CREATE UNIQUE INDEX "Annotation_id_key" ON "Annotation"("id");

-- CreateIndex
CREATE INDEX "Annotation_sourceId_idx" ON "Annotation"("sourceId");

-- CreateIndex
CREATE INDEX "Annotation_vaultId_idx" ON "Annotation"("vaultId");

-- CreateIndex
CREATE INDEX "Annotation_userId_idx" ON "Annotation"("userId");

-- CreateIndex
CREATE INDEX "Annotation_createdAt_idx" ON "Annotation"("createdAt");

-- CreateIndex
CREATE INDEX "Annotation_pageReference_idx" ON "Annotation"("pageReference");

-- CreateIndex
CREATE UNIQUE INDEX "CitationReference_id_key" ON "CitationReference"("id");

-- CreateIndex
CREATE INDEX "CitationReference_sourceId_idx" ON "CitationReference"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "CitationReference_sourceId_format_key" ON "CitationReference"("sourceId", "format");

-- CreateIndex
CREATE UNIQUE INDEX "VaultTag_id_key" ON "VaultTag"("id");

-- CreateIndex
CREATE INDEX "VaultTag_vaultId_idx" ON "VaultTag"("vaultId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultTag_vaultId_name_key" ON "VaultTag"("vaultId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SourceTag_id_key" ON "SourceTag"("id");

-- CreateIndex
CREATE INDEX "SourceTag_sourceId_idx" ON "SourceTag"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceTag_sourceId_name_key" ON "SourceTag"("sourceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_id_key" ON "AuditLog"("id");

-- CreateIndex
CREATE INDEX "AuditLog_vaultId_idx" ON "AuditLog"("vaultId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "FileLock_id_key" ON "FileLock"("id");

-- CreateIndex
CREATE INDEX "FileLock_expiresAt_idx" ON "FileLock"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "FileLock_vaultId_fileName_key" ON "FileLock"("vaultId", "fileName");

-- CreateIndex
CREATE UNIQUE INDEX "AnnotationLock_id_key" ON "AnnotationLock"("id");

-- CreateIndex
CREATE INDEX "AnnotationLock_expiresAt_idx" ON "AnnotationLock"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnotationLock_annotationId_key" ON "AnnotationLock"("annotationId");

-- AddForeignKey
ALTER TABLE "Vault" ADD CONSTRAINT "Vault_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultMember" ADD CONSTRAINT "VaultMember_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultMember" ADD CONSTRAINT "VaultMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRelationship" ADD CONSTRAINT "SourceRelationship_sourceAId_fkey" FOREIGN KEY ("sourceAId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRelationship" ADD CONSTRAINT "SourceRelationship_sourceBId_fkey" FOREIGN KEY ("sourceBId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitationReference" ADD CONSTRAINT "CitationReference_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultTag" ADD CONSTRAINT "VaultTag_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceTag" ADD CONSTRAINT "SourceTag_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileLock" ADD CONSTRAINT "FileLock_lockedBy_fkey" FOREIGN KEY ("lockedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationLock" ADD CONSTRAINT "AnnotationLock_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "Annotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationLock" ADD CONSTRAINT "AnnotationLock_lockedBy_fkey" FOREIGN KEY ("lockedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
