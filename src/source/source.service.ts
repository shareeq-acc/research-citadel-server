import { User, AuditAction, FileType, SourceType, VaultRole } from '@prisma/client';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { MulterFile } from 'src/common/types';
import { StorageService } from 'src/storage/storage.service';
import { CollaborationGateway } from 'src/collaboration/collaboration.gateway';
import { DocumentExtractionService } from 'src/document/document-extraction.service';
import { sourceSelect, SourceSelect } from './queries';
import { CreateSourceDto, UpdateSourceDto } from './dto';

const SOURCE_UPLOAD_PREFIX = 'uploads/sources/';

/** Normalize form/JSON value to string[] for Prisma (authors, keywords). */
function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === 'string');
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string')
        : [t];
    } catch {
      return t.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/** Normalize year from form (string) or JSON (number) to number | null. */
function ensureYear(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.trim());
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function mimeToFileType(mime: string): FileType {
  if (!mime) return FileType.OTHER;
  if (mime === 'application/pdf') return FileType.PDF;
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return FileType.DOCX;
  if (mime.startsWith('image/')) return FileType.IMAGE;
  if (mime.startsWith('video/')) return FileType.VIDEO;
  if (mime.includes('dataset') || mime.includes('csv') || mime.includes('json')) return FileType.DATASET;
  return FileType.OTHER;
}

@Injectable()
export class SourceService {
  private readonly logger = new AppLoggerService(SourceService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
    private readonly collaborationGateway: CollaborationGateway,
    private readonly documentExtractionService: DocumentExtractionService,
  ) {}

  private async ensureVaultMember(userId: string, vaultId: string): Promise<{ role: VaultRole }> {
    const member = await this.prismaService.vaultMember.findUnique({
      where: { vaultId_userId: { vaultId, userId } },
      select: { role: true },
    });
    if (!member) throw throwError('Vault not found or access denied', HttpStatus.NOT_FOUND);
    return member;
  }

  private async ensureCanEditSource(userId: string, vaultId: string): Promise<void> {
    const member = await this.ensureVaultMember(userId, vaultId);
    if (member.role === VaultRole.VIEWER) {
      throw throwError('Forbidden: only CONTRIBUTOR or OWNER can create or edit sources', HttpStatus.FORBIDDEN);
    }
  }

  async create(user: User, vaultId: string, dto: CreateSourceDto): Promise<ApiResponse<SourceSelect>> {
    try {
      await this.ensureCanEditSource(user.id, vaultId);

      const vault = await this.prismaService.vault.findFirst({
        where: { id: vaultId, deletedAt: null },
      });
      if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);

      if (dto.fileId) {
        const file = await this.prismaService.file.findFirst({
          where: { id: dto.fileId, vaultId, deletedAt: null },
        });
        if (!file) throw throwError('File not found in this vault', HttpStatus.NOT_FOUND);
      }

      const source = await this.prismaService.source.create({
        data: {
          vaultId,
          createdBy: user.id,
          title: dto.title,
          authors: ensureStringArray(dto.authors),
          publication: dto.publication ?? null,
          year: ensureYear(dto.year),
          externalUrl: dto.externalUrl ?? null,
          sourceType: dto.sourceType ?? SourceType.PDF,
          fileId: dto.fileId ?? null,
          abstract: dto.abstract ?? null,
          keywords: ensureStringArray(dto.keywords),
        },
        select: sourceSelect,
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.SOURCE_ADDED,
          entityType: 'source',
          entityId: source.id,
        },
      });

      this.collaborationGateway.emitSourceCreated(vaultId, source);

      return {
        message: 'Source created successfully',
        success: true,
        data: source,
      };
    } catch (err) {
      this.logger.error('Failed to create source', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'create',
        vaultId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to create source', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createWithFile(
    user: User,
    vaultId: string,
    dto: CreateSourceDto,
    file: MulterFile,
  ): Promise<ApiResponse<SourceSelect>> {
    try {
      await this.ensureCanEditSource(user.id, vaultId);

      const vault = await this.prismaService.vault.findFirst({
        where: { id: vaultId, deletedAt: null },
      });
      if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);

      // 1. Upload file to storage
      const { filename } = await this.storageService.uploadFile(file, SOURCE_UPLOAD_PREFIX);
      const fileUrl = this.storageService.getImageUrl(filename);
      const fileType = mimeToFileType(file.mimetype);

      // 2. Extract text from document (if supported)
      let extractedText: string | null = null;
      let extractedMetadata: any = null;
      let pageCount: number | null = null;

      if (this.documentExtractionService.isSupported(file.mimetype)) {
        try {
          this.logger.log(`Extracting text from ${file.mimetype} document`);
          const extraction = await this.documentExtractionService.extractText(file.buffer, file.mimetype);
          
          extractedText = extraction.text;
          extractedMetadata = extraction.metadata;
          pageCount = extraction.metadata.pages;

          // Auto-fill title from metadata if not provided
          if (!dto.title && extraction.metadata.title) {
            dto.title = extraction.metadata.title;
          }

          // Auto-fill author from metadata if not provided
          if ((!dto.authors || dto.authors.length === 0) && extraction.metadata.author) {
            dto.authors = [extraction.metadata.author];
          }

          this.logger.log(`Successfully extracted ${extraction.wordCount} words from document`);
        } catch (error) {
          this.logger.warn(`Document text extraction failed: ${error.message}`);
          // Continue without text extraction - not a critical error
        }
      }

      // 3. Create File record
      const fileRecord = await this.prismaService.file.create({
        data: {
          vaultId,
          uploadedBy: user.id,
          fileName: file.originalname,
          fileUrl,
          fileSize: file.size,
          fileMimeType: file.mimetype,
          fileType,
          pageCount,
        },
      });

      // 4. Create Source with extracted text
      const source = await this.prismaService.source.create({
        data: {
          vaultId,
          createdBy: user.id,
          title: dto.title,
          authors: ensureStringArray(dto.authors),
          publication: dto.publication ?? null,
          year: ensureYear(dto.year),
          externalUrl: dto.externalUrl ?? null,
          sourceType: dto.sourceType ?? SourceType.PDF,
          fileId: fileRecord.id,
          abstract: dto.abstract ?? null,
          keywords: ensureStringArray(dto.keywords),
          extractedText,
          extractedMetadata,
          textExtractedAt: extractedText ? new Date() : null,
        },
        select: sourceSelect,
      });

      // 5. Create audit logs
      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.SOURCE_ADDED,
          entityType: 'source',
          entityId: source.id,
          details: { 
            fileId: fileRecord.id,
            textExtracted: !!extractedText,
            wordCount: extractedText ? extractedText.split(/\s+/).length : 0,
          },
        },
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.FILE_UPLOADED,
          entityType: 'file',
          entityId: fileRecord.id,
        },
      });

      this.collaborationGateway.emitSourceCreated(vaultId, source);

      return {
        message: 'Source created and file uploaded successfully',
        success: true,
        data: source,
      };
    } catch (err) {
      this.logger.error('Failed to create source with file', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'createWithFile',
        vaultId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to create source with file',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllByVault(
    user: User,
    vaultId: string,
    params?: { page?: number; limit?: number },
  ): Promise<ApiResponse<{ sources: SourceSelect[]; total: number; page: number; limit: number }>> {
    try {
      await this.ensureVaultMember(user.id, vaultId);

      const page = Math.max(1, params?.page ?? 1);
      const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
      const skip = (page - 1) * limit;

      const [sources, total] = await Promise.all([
        this.prismaService.source.findMany({
          where: { vaultId, deletedAt: null },
          select: sourceSelect,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prismaService.source.count({ where: { vaultId, deletedAt: null } }),
      ]);

      return {
        message: 'Sources retrieved successfully',
        success: true,
        data: { sources, total, page, limit },
      };
    } catch (err) {
      this.logger.error('Failed to list sources', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'findAllByVault',
        vaultId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to list sources', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOne(user: User, vaultId: string, sourceId: string): Promise<ApiResponse<SourceSelect>> {
    try {
      await this.ensureVaultMember(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
        select: sourceSelect,
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      return {
        message: 'Source retrieved successfully',
        success: true,
        data: source,
      };
    } catch (err) {
      this.logger.error('Failed to get source', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'findOne',
        vaultId,
        sourceId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to get source', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(
    user: User,
    vaultId: string,
    sourceId: string,
    dto: UpdateSourceDto,
  ): Promise<ApiResponse<SourceSelect>> {
    try {
      await this.ensureCanEditSource(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      const updateData: {
        title?: string;
        authors?: string[];
        publication?: string | null;
        year?: number | null;
        externalUrl?: string | null;
        sourceType?: SourceType;
        fileId?: string | null;
        aiExtracted?: boolean;
        abstract?: string | null;
        keywords?: string[];
      } = {};
      if (dto.title !== undefined) updateData.title = dto.title;
      if (dto.authors !== undefined) updateData.authors = dto.authors;
      if (dto.publication !== undefined) updateData.publication = dto.publication;
      if (dto.year !== undefined) updateData.year = dto.year;
      if (dto.externalUrl !== undefined) updateData.externalUrl = dto.externalUrl;
      if (dto.sourceType !== undefined) updateData.sourceType = dto.sourceType;
      if (dto.fileId !== undefined) updateData.fileId = dto.fileId;
      if (dto.aiExtracted !== undefined) updateData.aiExtracted = dto.aiExtracted;
      if (dto.abstract !== undefined) updateData.abstract = dto.abstract;
      if (dto.keywords !== undefined) updateData.keywords = dto.keywords;

      const updated = await this.prismaService.source.update({
        where: { id: sourceId },
        data: updateData,
        select: sourceSelect,
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.SOURCE_UPDATED,
          entityType: 'source',
          entityId: sourceId,
          details: { updated: updateData },
        },
      });

      this.collaborationGateway.emitSourceUpdated(vaultId, updated);

      return {
        message: 'Source updated successfully',
        success: true,
        data: updated,
      };
    } catch (err) {
      this.logger.error('Failed to update source', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'update',
        vaultId,
        sourceId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to update source', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async remove(user: User, vaultId: string, sourceId: string): Promise<ApiResponse<{ id: string }>> {
    try {
      await this.ensureCanEditSource(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      await this.prismaService.source.update({
        where: { id: sourceId },
        data: { deletedAt: new Date() },
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.SOURCE_DELETED,
          entityType: 'source',
          entityId: sourceId,
        },
      });

      this.collaborationGateway.emitSourceDeleted(vaultId, sourceId);

      return {
        message: 'Source deleted successfully',
        success: true,
        data: { id: sourceId },
      };
    } catch (err) {
      this.logger.error('Failed to delete source', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'remove',
        vaultId,
        sourceId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to delete source', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
