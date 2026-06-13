import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User, VaultRole } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { PassportResponseDto, PassportVerificationDto, UpdatePassportDto } from './dto';

type PassportRecord = {
  id: string;
  barcode: string;
  vaultAlias: string | null;
  role: string | null;
  motto: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string; avatar: string | null; motto: string | null };
  vault: { id: string; name: string; ownerId: string; deletedAt: Date | null };
};

@Injectable()
export class PassportService {
  private readonly logger = new AppLoggerService(PassportService.name);

  constructor(private readonly prisma: PrismaService) {}

  private generateBarcode(passportId: string): string {
    const short = passportId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const rand = randomBytes(2).toString('hex').toUpperCase();
    return `AUTH-VT-${short}-${rand}`;
  }

  private async assertVaultAccess(userId: string, vaultId: string) {
    const vault = await this.prisma.vault.findFirst({
      where: { id: vaultId, deletedAt: null },
      select: { id: true, name: true, ownerId: true, deletedAt: true },
    });
    if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);

    const membership = await this.prisma.vaultMember.findUnique({
      where: { vaultId_userId: { vaultId, userId } },
      select: { role: true, acceptedAt: true, createdAt: true },
    });

    if (vault.ownerId !== userId && !membership) {
      throw throwError('You do not have access to this vault', HttpStatus.FORBIDDEN);
    }

    const memberRole =
      vault.ownerId === userId ? VaultRole.OWNER : membership!.role;

    const joinedAt = membership?.acceptedAt ?? membership?.createdAt ?? new Date();

    return { vault, membership, memberRole, joinedAt };
  }

  private toResponse(
    passport: PassportRecord,
    memberRole: VaultRole,
    joinedAt: Date,
  ): PassportResponseDto {
    const displayAlias = passport.vaultAlias?.trim() || passport.user.name;
    const displayMotto =
      passport.motto?.trim() ||
      passport.user.motto?.trim() ||
      'Data verification is the supreme virtue.';

    return {
      id: passport.id,
      barcode: passport.barcode,
      vaultAlias: passport.vaultAlias,
      role: passport.role,
      motto: passport.motto,
      displayAlias,
      displayMotto,
      agentName: passport.user.name,
      memberRole,
      vaultId: passport.vault.id,
      vaultName: passport.vault.name,
      joinedAt: joinedAt.toISOString(),
      userAvatar: passport.user.avatar,
      createdAt: passport.createdAt.toISOString(),
      updatedAt: passport.updatedAt.toISOString(),
    };
  }

  private passportInclude = {
    user: { select: { id: true, name: true, avatar: true, motto: true } },
    vault: { select: { id: true, name: true, ownerId: true, deletedAt: true } },
  } as const;

  async getOrCreate(user: User, vaultId: string): Promise<ApiResponse<PassportResponseDto>> {
    try {
      const { vault, memberRole, joinedAt } = await this.assertVaultAccess(user.id, vaultId);

      let passport = await this.prisma.vaultPassport.findUnique({
        where: { vaultId_userId: { vaultId, userId: user.id } },
        include: this.passportInclude,
      });

      if (!passport) {
        const id = randomUUID();
        passport = await this.prisma.vaultPassport.create({
          data: {
            id,
            vaultId,
            userId: user.id,
            barcode: this.generateBarcode(id),
          },
          include: this.passportInclude,
        });
      }

      return {
        success: true,
        message: 'Passport retrieved successfully',
        data: this.toResponse(passport as PassportRecord, memberRole, joinedAt),
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('Failed to get passport', (err as Error)?.stack, PassportService.name);
      throw throwError((err as Error)?.message || 'Failed to get passport', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(
    user: User,
    vaultId: string,
    dto: UpdatePassportDto,
  ): Promise<ApiResponse<PassportResponseDto>> {
    try {
      const { memberRole, joinedAt } = await this.assertVaultAccess(user.id, vaultId);

      await this.getOrCreate(user, vaultId);

      const passport = await this.prisma.vaultPassport.update({
        where: { vaultId_userId: { vaultId, userId: user.id } },
        data: {
          ...(dto.vaultAlias !== undefined && { vaultAlias: dto.vaultAlias.trim() || null }),
          ...(dto.role !== undefined && { role: dto.role.trim() || null }),
          ...(dto.motto !== undefined && { motto: dto.motto.trim() || null }),
        },
        include: this.passportInclude,
      });

      return {
        success: true,
        message: 'Passport updated successfully',
        data: this.toResponse(passport as PassportRecord, memberRole, joinedAt),
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('Failed to update passport', (err as Error)?.stack, PassportService.name);
      throw throwError((err as Error)?.message || 'Failed to update passport', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyByBarcode(barcode: string): Promise<ApiResponse<PassportVerificationDto>> {
    try {
      const passport = await this.prisma.vaultPassport.findUnique({
        where: { barcode },
        include: this.passportInclude,
      });

      if (!passport) {
        throw throwError('Passport not found', HttpStatus.NOT_FOUND);
      }

      const vaultExists = passport.vault.deletedAt === null;

      const membership = await this.prisma.vaultMember.findUnique({
        where: {
          vaultId_userId: { vaultId: passport.vaultId, userId: passport.userId },
        },
        select: { role: true, acceptedAt: true, createdAt: true },
      });

      const isOwner = passport.vault.ownerId === passport.userId;
      const isActiveMember = vaultExists && (isOwner || !!membership);
      const memberRole = isOwner
        ? VaultRole.OWNER
        : membership?.role ?? VaultRole.VIEWER;
      const joinedAt = membership?.acceptedAt ?? membership?.createdAt ?? passport.createdAt;

      const verified = isActiveMember;
      const verificationMessage = verified
        ? 'This passport is authentic. The holder is an active member of the vault.'
        : vaultExists
          ? 'This passport exists but the holder is no longer an active vault member.'
          : 'This passport references a vault that is no longer available.';

      const base = this.toResponse(passport as PassportRecord, memberRole, joinedAt);

      return {
        success: true,
        message: verified ? 'Passport verified successfully' : 'Passport could not be fully verified',
        data: {
          ...base,
          verified,
          verificationMessage,
          isActiveMember,
          vaultExists,
        },
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('Failed to verify passport', (err as Error)?.stack, PassportService.name);
      throw throwError((err as Error)?.message || 'Failed to verify passport', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
