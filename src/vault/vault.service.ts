import { User, AuditAction, VaultPrivacy, VaultRole } from '@prisma/client';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { CollaborationGateway } from 'src/collaboration/collaboration.gateway';
import { QaService } from 'src/ai/services/qa.service';
import { vaultSelect, VaultSelect, VaultWithMyRole, vaultSelectWithMembers, VaultWithMyRoleAndMembers } from './queries';
import { CreateVaultDto, UpdateVaultDto, AddVaultMemberDto } from './dto';
import { VaultAuditStatsEntry } from './dto';

@Injectable()
export class VaultService {
  private readonly logger = new AppLoggerService(VaultService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly collaborationGateway: CollaborationGateway,
    private readonly qaService: QaService,
  ) {}

  async findAllByUser(user: User): Promise<ApiResponse<VaultWithMyRole[]>> {
    try {
      const vaults = await this.prismaService.vault.findMany({
        where: {
          deletedAt: null,
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        },
        select: vaultSelect,
        orderBy: { updatedAt: 'desc' },
      });
      if (vaults.length === 0) {
        return {
          message: 'Vaults retrieved successfully',
          success: true,
          data: [],
        };
      }
      const vaultIds = vaults.map((v) => v.id);
      const memberships = await this.prismaService.vaultMember.findMany({
        where: { userId: user.id, vaultId: { in: vaultIds } },
        select: { vaultId: true, role: true },
      });
      const roleByVaultId = new Map(memberships.map((m) => [m.vaultId, m.role]));
      const data: VaultWithMyRole[] = vaults.map((v) => ({
        ...v,
        myRole: v.ownerId === user.id ? VaultRole.OWNER : (roleByVaultId.get(v.id) ?? VaultRole.VIEWER),
      }));
      return {
        message: 'Vaults retrieved successfully',
        success: true,
        data,
      };
    } catch (err) {
      this.logger.error('Failed to list vaults', err.stack, VaultService.name);
      throw throwError(err.message || 'Failed to list vaults', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOne(user: User, vaultId: string): Promise<ApiResponse<VaultWithMyRoleAndMembers>> {
    try {
      const vault = await this.prismaService.vault.findFirst({
        where: { id: vaultId, deletedAt: null },
        select: vaultSelectWithMembers,
      });
      if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);
      const membership = await this.prismaService.vaultMember.findUnique({
        where: { vaultId_userId: { vaultId, userId: user.id } },
        select: { role: true },
      });
      if (vault.ownerId !== user.id && !membership) {
        throw throwError('You do not have access to this vault', HttpStatus.FORBIDDEN);
      }
      const myRole = vault.ownerId === user.id ? VaultRole.OWNER : membership!.role;
      const data: VaultWithMyRoleAndMembers = { ...vault, myRole };
      return {
        message: 'Vault retrieved successfully',
        success: true,
        data,
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('Failed to get vault', (err as Error)?.stack, VaultService.name);
      throw throwError((err as Error)?.message || 'Vault not found', HttpStatus.NOT_FOUND);
    }
  }

  async create(user: User, dto: CreateVaultDto): Promise<ApiResponse<VaultSelect>> {
    try {
      const vault = await this.prismaService.vault.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          privacy: dto.privacy ?? 'PRIVATE',
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              role: VaultRole.OWNER,
              acceptedAt: new Date(),
            },
          },
        },
        select: vaultSelect,
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId: vault.id,
          userId: user.id,
          action: AuditAction.VAULT_CREATED,
          entityType: 'vault',
          entityId: vault.id,
        },
      });

      return {
        message: 'Vault created successfully',
        success: true,
        data: vault,
      };
    } catch (err) {
      this.logger.error('Failed to create vault', err.stack, VaultService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'create',
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to create vault', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(user: User, vaultId: string, dto: UpdateVaultDto): Promise<ApiResponse<VaultSelect>> {
    try {
      const vault = await this.prismaService.vault.findFirst({
        where: { id: vaultId, deletedAt: null },
      });
      if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);
      if (vault.ownerId !== user.id) throw throwError('Forbidden: only the owner can update this vault', HttpStatus.FORBIDDEN);

      const updateData: { name?: string; description?: string | null; privacy?: VaultPrivacy } = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.privacy !== undefined) updateData.privacy = dto.privacy;

      const updated = await this.prismaService.vault.update({
        where: { id: vaultId },
        data: updateData,
        select: vaultSelect,
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId: updated.id,
          userId: user.id,
          action: AuditAction.VAULT_UPDATED,
          entityType: 'vault',
          entityId: updated.id,
          details: { updated: updateData },
        },
      });

      return {
        message: 'Vault updated successfully',
        success: true,
        data: updated,
      };
    } catch (err) {
      this.logger.error('Failed to update vault', err.stack, VaultService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'update',
        vaultId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to update vault', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async delete(user: User, vaultId: string): Promise<ApiResponse<{ id: string }>> {
    try {
      const vault = await this.prismaService.vault.findFirst({
        where: { id: vaultId, deletedAt: null },
      });
      if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);
      if (vault.ownerId !== user.id) throw throwError('Forbidden: only the owner can delete this vault', HttpStatus.FORBIDDEN);

      await this.prismaService.vault.update({
        where: { id: vaultId },
        data: { deletedAt: new Date() },
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId: vault.id,
          userId: user.id,
          action: AuditAction.VAULT_DELETED,
          entityType: 'vault',
          entityId: vault.id,
        },
      });

      return {
        message: 'Vault deleted successfully',
        success: true,
        data: { id: vaultId },
      };
    } catch (err) {
      this.logger.error('Failed to delete vault', err.stack, VaultService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'delete',
        vaultId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to delete vault', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addMember(user: User, vaultId: string, dto: AddVaultMemberDto): Promise<ApiResponse<{ vaultId: string; userId: string; role: VaultRole }>> {
    try {
      if (dto.role === VaultRole.OWNER) {
        throw throwError('Cannot add a member with OWNER role; vault already has an owner', HttpStatus.BAD_REQUEST);
      }

      const vault = await this.prismaService.vault.findFirst({
        where: { id: vaultId, deletedAt: null },
      });
      if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);
      if (vault.ownerId !== user.id) {
        throw throwError('Forbidden: only the owner can add members to this vault', HttpStatus.FORBIDDEN);
      }

      const targetUser = await this.prismaService.user.findUnique({
        where: { id: dto.userId },
      });
      if (!targetUser) throw throwError('User not found', HttpStatus.NOT_FOUND);

      const existing = await this.prismaService.vaultMember.findUnique({
        where: { vaultId_userId: { vaultId, userId: dto.userId } },
      });
      if (existing) throw throwError('User is already a member of this vault', HttpStatus.CONFLICT);

      const member = await this.prismaService.vaultMember.create({
        data: {
          vaultId,
          userId: dto.userId,
          role: dto.role,
          invitedBy: user.id,
          acceptedAt: new Date(),
        },
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.MEMBER_ADDED,
          entityType: 'member',
          entityId: member.id,
          details: { addedUserId: dto.userId, role: dto.role },
        },
      });

      this.collaborationGateway.emitVaultAddedToUser(dto.userId, {
        vaultId,
        vaultName: vault.name,
        addedByName: user.name ?? 'Someone',
      });

      return {
        message: 'Member added to vault successfully',
        success: true,
        data: { vaultId, userId: member.userId, role: member.role },
      };
    } catch (err) {
      this.logger.error('Failed to add vault member', err.stack, VaultService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'addMember',
        vaultId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to add member to vault', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAuditLogsByVault(
    user: User,
    vaultId: string,
    options?: { limit?: number; offset?: number; action?: string },
  ): Promise<ApiResponse<AuditLogEntry[]>> {
    try {
      const vault = await this.prismaService.vault.findFirst({
        where: { id: vaultId, deletedAt: null },
      });
      if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);
      const membership = await this.prismaService.vaultMember.findUnique({
        where: { vaultId_userId: { vaultId, userId: user.id } },
      });
      if (vault.ownerId !== user.id && !membership) {
        throw throwError('You do not have access to this vault', HttpStatus.FORBIDDEN);
      }

      const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
      const offset = Math.max(options?.offset ?? 0, 0);
      const where: { vaultId: string; action?: AuditAction } = { vaultId };
      if (options?.action && Object.values(AuditAction).includes(options.action as AuditAction)) {
        where.action = options.action as AuditAction;
      }

      const logs = await this.prismaService.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          vaultId: true,
          userId: true,
          action: true,
          entityType: true,
          entityId: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      const data: AuditLogEntry[] = logs.map((l) => ({
        id: l.id,
        vaultId: l.vaultId,
        userId: l.userId,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        details: l.details,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        createdAt: l.createdAt,
        user: l.user,
      }));

      return {
        message: 'Audit logs retrieved successfully',
        success: true,
        data,
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('Failed to get audit logs', (err as Error)?.stack, VaultService.name);
      throw throwError((err as Error)?.message || 'Failed to get audit logs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getVaultAuditStats(
    user: User,
    vaultId: string,
  ): Promise<ApiResponse<VaultAuditStatsEntry[]>> {
    try {
      const vault = await this.prismaService.vault.findFirst({
        where: { id: vaultId, deletedAt: null },
      });
      if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);
      const membership = await this.prismaService.vaultMember.findUnique({
        where: { vaultId_userId: { vaultId, userId: user.id } },
      });
      if (vault.ownerId !== user.id && !membership) {
        throw throwError('You do not have access to this vault', HttpStatus.FORBIDDEN);
      }

      const grouped = await this.prismaService.auditLog.groupBy({
        by: ['userId', 'action'],
        where: { vaultId },
        _count: { id: true },
      });

      const userIds = [...new Set(grouped.map((g) => g.userId))];
      if (userIds.length === 0) {
        return {
          message: 'Vault audit stats retrieved successfully',
          success: true,
          data: [],
        };
      }

      const users = await this.prismaService.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, avatar: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      const statsByUser = new Map<
        string,
        { actionCounts: Record<string, number>; totalCount: number }
      >();
      for (const row of grouped) {
        let entry = statsByUser.get(row.userId);
        if (!entry) {
          entry = { actionCounts: {}, totalCount: 0 };
          statsByUser.set(row.userId, entry);
        }
        entry.actionCounts[row.action] = row._count.id;
        entry.totalCount += row._count.id;
      }

      const data: VaultAuditStatsEntry[] = Array.from(statsByUser.entries())
        .map(([uid, stats]) => {
          const u = userMap.get(uid);
          return {
            user: u
              ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar }
              : { id: uid, name: 'Unknown', email: '', avatar: null },
            actionCounts: stats.actionCounts,
            totalCount: stats.totalCount,
          };
        })
        .sort((a, b) => b.totalCount - a.totalCount);

      return {
        message: 'Vault audit stats retrieved successfully',
        success: true,
        data,
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('Failed to get vault audit stats', (err as Error)?.stack, VaultService.name);
      throw throwError((err as Error)?.message || 'Failed to get vault audit stats', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async askQuestion(
    user: User,
    vaultId: string,
    question: string,
    sourceIds?: string[],
  ): Promise<ApiResponse<import('src/ai/dto/qa.dto').QaAnswerDto>> {
    try {
      // Any vault member can ask questions
      const member = await this.prismaService.vaultMember.findUnique({
        where: { vaultId_userId: { vaultId, userId: user.id } },
      });
      if (!member) throw throwError('Vault not found or access denied', HttpStatus.NOT_FOUND);

      const answer = await this.qaService.answerQuestion(vaultId, question, sourceIds);

      return {
        message: 'Question answered successfully',
        success: true,
        data: answer,
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('Failed to answer question', (err as Error)?.stack, VaultService.name);
      throw throwError((err as Error)?.message || 'Failed to answer question', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

export type AuditLogEntry = {
  id: string;
  vaultId: string;
  userId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: { id: string; name: string; email: string; avatar: string | null };
};

export type { VaultAuditStatsEntry } from './dto';
