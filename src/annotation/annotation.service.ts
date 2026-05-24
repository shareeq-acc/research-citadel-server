import { User, AuditAction, VaultRole } from '@prisma/client';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { CollaborationGateway } from 'src/collaboration/collaboration.gateway';
import { MarkdownEnhanceService } from 'src/ai/services/markdown-enhance.service';
import { annotationSelect, AnnotationSelect } from './queries';
import { CreateAnnotationDto, UpdateAnnotationDto } from './dto';

@Injectable()
export class AnnotationService {
  private readonly logger = new AppLoggerService(AnnotationService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly collaborationGateway: CollaborationGateway,
    private readonly markdownEnhanceService: MarkdownEnhanceService,
  ) {}

  private async ensureVaultMember(userId: string, vaultId: string): Promise<{ role: VaultRole }> {
    const member = await this.prismaService.vaultMember.findUnique({
      where: { vaultId_userId: { vaultId, userId } },
      select: { role: true },
    });
    if (!member) throw throwError('Vault not found or access denied', HttpStatus.NOT_FOUND);
    return member;
  }

  private async ensureCanEditAnnotation(userId: string, vaultId: string): Promise<void> {
    const member = await this.ensureVaultMember(userId, vaultId);
    if (member.role === VaultRole.VIEWER) {
      throw throwError(
        'Forbidden: only CONTRIBUTOR or OWNER can create or edit annotations',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async enhanceContent(
    user: User,
    vaultId: string,
    sourceId: string,
    contentMarkdown: string,
  ): Promise<ApiResponse<{ enhancedMarkdown: string }>> {
    await this.ensureCanEditAnnotation(user.id, vaultId);
    const source = await this.prismaService.source.findFirst({
      where: { id: sourceId, vaultId, deletedAt: null },
    });
    if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);
    const enhancedMarkdown = await this.markdownEnhanceService.enhanceMarkdown(contentMarkdown);
    return {
      message: 'Annotation content enhanced successfully',
      success: true,
      data: { enhancedMarkdown },
    };
  }

  async create(
    user: User,
    vaultId: string,
    sourceId: string,
    dto: CreateAnnotationDto,
  ): Promise<ApiResponse<AnnotationSelect>> {
    try {
      await this.ensureCanEditAnnotation(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      const contentHtml = dto.contentHtml ?? dto.contentMarkdown;

      const annotation = await this.prismaService.annotation.create({
        data: {
          sourceId,
          vaultId,
          userId: user.id,
          contentMarkdown: dto.contentMarkdown,
          contentHtml,
          pageReference: dto.pageReference ?? null,
          sectionReference: dto.sectionReference ?? null,
        },
        select: annotationSelect,
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.ANNOTATION_ADDED,
          entityType: 'annotation',
          entityId: annotation.id,
          details: { sourceId },
        },
      });

      this.collaborationGateway.emitAnnotationCreated(vaultId, sourceId, annotation);

      return {
        message: 'Annotation created successfully',
        success: true,
        data: annotation,
      };
    } catch (err) {
      this.logger.error('Failed to create annotation', err.stack, AnnotationService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'create',
        vaultId,
        sourceId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to create annotation',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllBySource(
    user: User,
    vaultId: string,
    sourceId: string,
    params?: { page?: number; limit?: number },
  ): Promise<
    ApiResponse<{
      annotations: AnnotationSelect[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    try {
      await this.ensureVaultMember(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      const page = Math.max(1, params?.page ?? 1);
      const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
      const skip = (page - 1) * limit;

      const [annotations, total] = await Promise.all([
        this.prismaService.annotation.findMany({
          where: { sourceId, vaultId, deletedAt: null },
          select: annotationSelect,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prismaService.annotation.count({
          where: { sourceId, vaultId, deletedAt: null },
        }),
      ]);

      return {
        message: 'Annotations retrieved successfully',
        success: true,
        data: { annotations, total, page, limit },
      };
    } catch (err) {
      this.logger.error('Failed to list annotations', err.stack, AnnotationService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'findAllBySource',
        vaultId,
        sourceId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to list annotations',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(
    user: User,
    vaultId: string,
    sourceId: string,
    annotationId: string,
  ): Promise<ApiResponse<AnnotationSelect>> {
    try {
      await this.ensureVaultMember(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      const annotation = await this.prismaService.annotation.findFirst({
        where: { id: annotationId, sourceId, vaultId, deletedAt: null },
        select: annotationSelect,
      });
      if (!annotation) throw throwError('Annotation not found', HttpStatus.NOT_FOUND);

      return {
        message: 'Annotation retrieved successfully',
        success: true,
        data: annotation,
      };
    } catch (err) {
      this.logger.error('Failed to get annotation', err.stack, AnnotationService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'findOne',
        vaultId,
        sourceId,
        annotationId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to get annotation',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    user: User,
    vaultId: string,
    sourceId: string,
    annotationId: string,
    dto: UpdateAnnotationDto,
  ): Promise<ApiResponse<AnnotationSelect>> {
    try {
      await this.ensureCanEditAnnotation(user.id, vaultId);

      const annotation = await this.prismaService.annotation.findFirst({
        where: { id: annotationId, sourceId, vaultId, deletedAt: null },
      });
      if (!annotation) throw throwError('Annotation not found', HttpStatus.NOT_FOUND);

      const updateData: {
        contentMarkdown?: string;
        contentHtml?: string;
        pageReference?: number | null;
        sectionReference?: string | null;
        version?: number;
      } = {};
      if (dto.contentMarkdown !== undefined) updateData.contentMarkdown = dto.contentMarkdown;
      if (dto.contentHtml !== undefined) updateData.contentHtml = dto.contentHtml;
      if (dto.pageReference !== undefined) updateData.pageReference = dto.pageReference;
      if (dto.sectionReference !== undefined) updateData.sectionReference = dto.sectionReference;
      if (dto.contentMarkdown !== undefined || dto.contentHtml !== undefined) {
        updateData.version = annotation.version + 1;
      }

      const updated = await this.prismaService.annotation.update({
        where: { id: annotationId },
        data: updateData,
        select: annotationSelect,
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.ANNOTATION_UPDATED,
          entityType: 'annotation',
          entityId: annotationId,
          details: { updated: updateData },
        },
      });

      this.collaborationGateway.emitAnnotationUpdated(vaultId, sourceId, updated);

      return {
        message: 'Annotation updated successfully',
        success: true,
        data: updated,
      };
    } catch (err) {
      this.logger.error('Failed to update annotation', err.stack, AnnotationService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'update',
        vaultId,
        sourceId,
        annotationId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to update annotation',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(
    user: User,
    vaultId: string,
    sourceId: string,
    annotationId: string,
  ): Promise<ApiResponse<{ id: string }>> {
    try {
      await this.ensureCanEditAnnotation(user.id, vaultId);

      const annotation = await this.prismaService.annotation.findFirst({
        where: { id: annotationId, sourceId, vaultId, deletedAt: null },
      });
      if (!annotation) throw throwError('Annotation not found', HttpStatus.NOT_FOUND);

      await this.prismaService.annotation.update({
        where: { id: annotationId },
        data: { deletedAt: new Date() },
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.ANNOTATION_DELETED,
          entityType: 'annotation',
          entityId: annotationId,
        },
      });

      this.collaborationGateway.emitAnnotationDeleted(vaultId, sourceId, annotationId);

      return {
        message: 'Annotation deleted successfully',
        success: true,
        data: { id: annotationId },
      };
    } catch (err) {
      this.logger.error('Failed to delete annotation', err.stack, AnnotationService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'remove',
        vaultId,
        sourceId,
        annotationId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to delete annotation',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
