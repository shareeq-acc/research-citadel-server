import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InvitationStatus, User, VaultRole } from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { generateUrlSafeToken } from 'src/common/utils/hash';
import { MailerService } from 'src/mailer/mailer.service';
import { SendInvitationDto, RespondInvitationDto } from './dto/invitation.dto';
import { ConfigService } from '@nestjs/config';
import { NotificationEventBus } from 'src/notification/notification-event.bus';
import { NotificationEvents } from 'src/notification/events/notification.events';

const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class InvitationService {
  private readonly logger = new AppLoggerService(InvitationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
    private readonly notificationEventBus: NotificationEventBus,
  ) {}

  // ── Send invitation ────────────────────────────────────────────────────────

  async sendInvitation(
    sender: User,
    vaultId: string,
    dto: SendInvitationDto,
  ): Promise<ApiResponse<{ invitationId: string }>> {
    try {
      // Vault must exist and sender must be owner
      const vault = await this.prisma.vault.findFirst({
        where: { id: vaultId, deletedAt: null },
        select: { id: true, name: true, ownerId: true },
      });
      if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);
      if (vault.ownerId !== sender.id)
        throw throwError('Only the vault owner can send invitations', HttpStatus.FORBIDDEN);
      if (dto.role === VaultRole.OWNER)
        throw throwError('Cannot invite someone as OWNER', HttpStatus.BAD_REQUEST);

      // Target user must exist
      const invitedUser = await this.prisma.user.findUnique({
        where: { id: dto.invitedUserId },
        select: { id: true, name: true, email: true },
      });
      if (!invitedUser) throw throwError('User not found', HttpStatus.NOT_FOUND);
      if (invitedUser.id === sender.id)
        throw throwError('You cannot invite yourself', HttpStatus.BAD_REQUEST);

      // Must not already be a vault member
      const alreadyMember = await this.prisma.vaultMember.findUnique({
        where: { vaultId_userId: { vaultId, userId: dto.invitedUserId } },
      });
      if (alreadyMember)
        throw throwError('User is already a member of this vault', HttpStatus.CONFLICT);

      // Cancel any existing pending invitation for same user+vault
      await this.prisma.vaultInvitation.updateMany({
        where: { vaultId, invitedUserId: dto.invitedUserId, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.EXPIRED },
      });

      // Create invitation
      const token = generateUrlSafeToken();
      const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      const invitation = await this.prisma.vaultInvitation.create({
        data: {
          vaultId,
          invitedUserId: dto.invitedUserId,
          invitedBy: sender.id,
          role: dto.role,
          token,
          expiresAt,
        },
      });

      // Send invitation email
      await this.mailer.sendVaultInvitationEmail({
        toEmail: invitedUser.email,
        toName: invitedUser.name,
        senderName: sender.name,
        vaultName: vault.name,
        role: dto.role,
        token,
        expiresAt,
      });

      this.notificationEventBus.emitEvent(NotificationEvents.INVITATION_SENT, {
        invitedUserId: dto.invitedUserId,
        invitationId: invitation.id,
        vaultId,
        vaultName: vault.name,
        senderName: sender.name,
        role: dto.role,
        token,
      });

      return {
        message: 'Invitation sent successfully',
        success: true,
        data: { invitationId: invitation.id },
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('sendInvitation failed', (err as Error)?.stack, InvitationService.name);
      throw throwError((err as Error)?.message || 'Failed to send invitation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── Respond to invitation (accept / reject) ────────────────────────────────

  async respondToInvitation(
    user: User,
    dto: RespondInvitationDto,
  ): Promise<ApiResponse<{ status: string }>> {
    try {
      const invitation = await this.prisma.vaultInvitation.findUnique({
        where: { token: dto.token },
        include: {
          vault: { select: { id: true, name: true, ownerId: true } },
          sender: { select: { id: true, name: true, email: true } },
          invitedUser: { select: { id: true, name: true, email: true } },
        },
      });

      if (!invitation) throw throwError('Invitation not found or invalid token', HttpStatus.NOT_FOUND);
      if (invitation.invitedUserId !== user.id)
        throw throwError('This invitation was not sent to you', HttpStatus.FORBIDDEN);
      if (invitation.status !== InvitationStatus.PENDING)
        throw throwError(`Invitation has already been ${invitation.status.toLowerCase()}`, HttpStatus.CONFLICT);
      if (invitation.expiresAt < new Date()) {
        await this.prisma.vaultInvitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
        throw throwError('Invitation has expired', HttpStatus.GONE);
      }

      const newStatus = dto.action === 'ACCEPTED' ? InvitationStatus.ACCEPTED : InvitationStatus.REJECTED;

      await this.prisma.vaultInvitation.update({
        where: { id: invitation.id },
        data: { status: newStatus, respondedAt: new Date() },
      });

      if (newStatus === InvitationStatus.ACCEPTED) {
        // Add to vault members (upsert in case of race)
        await this.prisma.vaultMember.upsert({
          where: { vaultId_userId: { vaultId: invitation.vaultId, userId: invitation.invitedUserId } },
          update: { role: invitation.role, acceptedAt: new Date() },
          create: {
            vaultId: invitation.vaultId,
            userId: invitation.invitedUserId,
            role: invitation.role,
            invitedBy: invitation.invitedBy,
            acceptedAt: new Date(),
          },
        });
      }

      // Notify the sender
      await this.mailer.sendInvitationResponseEmail({
        toEmail: invitation.sender.email,
        toName: invitation.sender.name,
        respondentName: invitation.invitedUser.name,
        vaultName: invitation.vault.name,
        action: newStatus === InvitationStatus.ACCEPTED ? 'accepted' : 'rejected',
      });

      this.notificationEventBus.emitEvent(NotificationEvents.INVITATION_RESPONDED, {
        senderId: invitation.invitedBy,
        vaultId: invitation.vaultId,
        vaultName: invitation.vault.name,
        respondentName: invitation.invitedUser.name,
        accepted: newStatus === InvitationStatus.ACCEPTED,
      });

      return {
        message: `Invitation ${newStatus.toLowerCase()} successfully`,
        success: true,
        data: { status: newStatus },
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('respondToInvitation failed', (err as Error)?.stack, InvitationService.name);
      throw throwError((err as Error)?.message || 'Failed to respond to invitation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── Get invitation details by token (public — for the response page) ────────

  async getInvitationByToken(token: string): Promise<ApiResponse<{
    id: string;
    vaultName: string;
    senderName: string;
    role: string;
    status: string;
    expiresAt: Date;
    invitedUser: { id: string; name: string; email: string };
  }>> {
    try {
      const inv = await this.prisma.vaultInvitation.findUnique({
        where: { token },
        include: {
          vault: { select: { name: true } },
          sender: { select: { name: true } },
          invitedUser: { select: { id: true, name: true, email: true } },
        },
      });
      if (!inv) throw throwError('Invitation not found', HttpStatus.NOT_FOUND);

      return {
        message: 'Invitation retrieved',
        success: true,
        data: {
          id: inv.id,
          vaultName: inv.vault.name,
          senderName: inv.sender.name,
          role: inv.role,
          status: inv.status,
          expiresAt: inv.expiresAt,
          invitedUser: inv.invitedUser,
        },
      };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      throw throwError((err as Error)?.message || 'Failed to get invitation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── List pending invitations for the current user ──────────────────────────

  async getMyInvitations(user: User): Promise<ApiResponse<any[]>> {
    try {
      const invitations = await this.prisma.vaultInvitation.findMany({
        where: { invitedUserId: user.id, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } },
        include: {
          vault: { select: { id: true, name: true } },
          sender: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { message: 'Invitations retrieved', success: true, data: invitations };
    } catch (err: unknown) {
      throw throwError((err as Error)?.message || 'Failed to get invitations', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
