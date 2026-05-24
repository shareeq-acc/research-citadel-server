import { User, CitationFormat, VaultRole } from '@prisma/client';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { citationSelect, CitationSelect } from './queries';
import { CreateCitationDto, UpdateCitationDto } from './dto';

@Injectable()
export class CitationService {
  private readonly logger = new AppLoggerService(CitationService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private async ensureVaultMember(userId: string, vaultId: string): Promise<{ role: VaultRole }> {
    const member = await this.prismaService.vaultMember.findUnique({
      where: { vaultId_userId: { vaultId, userId } },
      select: { role: true },
    });
    if (!member) throw throwError('Vault not found or access denied', HttpStatus.NOT_FOUND);
    return member;
  }

  private async ensureCanEditCitation(userId: string, vaultId: string): Promise<void> {
    const member = await this.ensureVaultMember(userId, vaultId);
    if (member.role === VaultRole.VIEWER) {
      throw throwError(
        'Forbidden: only CONTRIBUTOR or OWNER can create or edit citations',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async create(
    user: User,
    vaultId: string,
    sourceId: string,
    dto: CreateCitationDto,
  ): Promise<ApiResponse<CitationSelect>> {
    try {
      await this.ensureCanEditCitation(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      const citation = await this.prismaService.citationReference.upsert({
        where: {
          sourceId_format: { sourceId, format: dto.format },
        },
        create: {
          sourceId,
          format: dto.format,
          citation: dto.citation,
        },
        update: {
          citation: dto.citation,
        },
        select: citationSelect,
      });

      return {
        message: 'Citation created or updated successfully',
        success: true,
        data: citation,
      };
    } catch (err) {
      this.logger.error('Failed to create citation', err.stack, CitationService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'create',
        vaultId,
        sourceId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to create citation',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllBySource(
    user: User,
    vaultId: string,
    sourceId: string,
  ): Promise<ApiResponse<CitationSelect[]>> {
    try {
      await this.ensureVaultMember(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      const citations = await this.prismaService.citationReference.findMany({
        where: { sourceId },
        select: citationSelect,
        orderBy: { format: 'asc' },
      });

      return {
        message: 'Citations retrieved successfully',
        success: true,
        data: citations,
      };
    } catch (err) {
      this.logger.error('Failed to list citations', err.stack, CitationService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'findAllBySource',
        vaultId,
        sourceId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to list citations',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(
    user: User,
    vaultId: string,
    sourceId: string,
    citationId: string,
  ): Promise<ApiResponse<CitationSelect>> {
    try {
      await this.ensureVaultMember(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      const citation = await this.prismaService.citationReference.findFirst({
        where: { id: citationId, sourceId },
        select: citationSelect,
      });
      if (!citation) throw throwError('Citation not found', HttpStatus.NOT_FOUND);

      return {
        message: 'Citation retrieved successfully',
        success: true,
        data: citation,
      };
    } catch (err) {
      this.logger.error('Failed to get citation', err.stack, CitationService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'findOne',
        vaultId,
        sourceId,
        citationId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to get citation',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    user: User,
    vaultId: string,
    sourceId: string,
    citationId: string,
    dto: UpdateCitationDto,
  ): Promise<ApiResponse<CitationSelect>> {
    try {
      await this.ensureCanEditCitation(user.id, vaultId);

      const citation = await this.prismaService.citationReference.findFirst({
        where: { id: citationId, sourceId },
      });
      if (!citation) throw throwError('Citation not found', HttpStatus.NOT_FOUND);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      const updated = await this.prismaService.citationReference.update({
        where: { id: citationId },
        data: { citation: dto.citation },
        select: citationSelect,
      });

      return {
        message: 'Citation updated successfully',
        success: true,
        data: updated,
      };
    } catch (err) {
      this.logger.error('Failed to update citation', err.stack, CitationService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'update',
        vaultId,
        sourceId,
        citationId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to update citation',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(
    user: User,
    vaultId: string,
    sourceId: string,
    citationId: string,
  ): Promise<ApiResponse<{ id: string }>> {
    try {
      await this.ensureCanEditCitation(user.id, vaultId);

      const citation = await this.prismaService.citationReference.findFirst({
        where: { id: citationId, sourceId },
      });
      if (!citation) throw throwError('Citation not found', HttpStatus.NOT_FOUND);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      await this.prismaService.citationReference.delete({
        where: { id: citationId },
      });

      return {
        message: 'Citation deleted successfully',
        success: true,
        data: { id: citationId },
      };
    } catch (err) {
      this.logger.error('Failed to delete citation', err.stack, CitationService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'remove',
        vaultId,
        sourceId,
        citationId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to delete citation',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
