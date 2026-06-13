import { HttpStatus, Injectable } from '@nestjs/common';
import { Notification, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { CollaborationGateway } from 'src/collaboration/collaboration.gateway';
import { MailerService } from 'src/mailer/mailer.service';
import { AlertPreferenceKey, parseAlertPreferences } from 'src/user/dto/alert-preferences.dto';
import { parseVaultPreferences } from 'src/vault/dto/vault-preferences.dto';
import { NotificationDto } from './types';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  /** When set, notification is skipped if the user has this alert category disabled. */
  alertCategory?: AlertPreferenceKey;
  /** When true (default), also send an email if the alert category is enabled. */
  sendEmail?: boolean;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collaborationGateway: CollaborationGateway,
    private readonly mailerService: MailerService,
  ) {}

  toDto(notification: Notification): NotificationDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      description: notification.description,
      read: notification.read,
      metadata: (notification.metadata as Record<string, unknown> | null) ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  async createAndPush(input: CreateNotificationInput): Promise<NotificationDto | null> {
    const allowed = await this.isAlertAllowed(input);
    if (!allowed) return null;

    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        description: input.description,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    await this.prisma.user.update({
      where: { id: input.userId },
      data: { hasNotifications: true },
    });

    const dto = this.toDto(notification);
    this.collaborationGateway.emitNotificationToUser(input.userId, dto);

    if (input.sendEmail !== false) {
      void this.sendAlertEmail(input);
    }

    return dto;
  }

  private async isAlertAllowed(input: CreateNotificationInput): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { alertPreferences: true, email: true, name: true },
    });

    if (!user) return false;

    if (input.alertCategory) {
      const prefs = parseAlertPreferences(user.alertPreferences);
      if (!prefs[input.alertCategory]) return false;
    }

    const vaultId = input.metadata?.vaultId;
    if (typeof vaultId === 'string') {
      const muted = await this.isVaultMuted(input.userId, vaultId);
      if (muted) return false;
    }

    return true;
  }

  private async isVaultMuted(userId: string, vaultId: string): Promise<boolean> {
    const membership = await this.prisma.vaultMember.findUnique({
      where: { vaultId_userId: { vaultId, userId } },
      select: { preferences: true },
    });

    if (!membership) return false;
    return parseVaultPreferences(membership.preferences).muted;
  }

  private async sendAlertEmail(input: CreateNotificationInput): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true, name: true },
      });
      if (!user?.email) return;

      const linkPath = typeof input.metadata?.linkPath === 'string' ? input.metadata.linkPath : undefined;
      await this.mailerService.sendAlertEmail({
        toEmail: user.email,
        toName: user.name,
        title: input.title,
        description: input.description,
        linkPath,
      });
    } catch {
      // Email delivery is best-effort; in-app notification already sent.
    }
  }

  async listForUser(
    userId: string,
    options: { limit?: number; unreadOnly?: boolean } = {},
  ): Promise<ApiResponse<NotificationDto[]>> {
    const limit = Math.min(options.limit ?? 50, 100);

    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(options.unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      message: 'Notifications retrieved',
      success: true,
      data: notifications.map((n) => this.toDto(n)),
    };
  }

  async getUnreadCount(userId: string): Promise<ApiResponse<{ count: number }>> {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return {
      message: 'Unread count retrieved',
      success: true,
      data: { count },
    };
  }

  async markRead(userId: string, notificationId: string): Promise<ApiResponse<NotificationDto>> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw throwError('Notification not found', HttpStatus.NOT_FOUND);
    }

    const updated = notification.read
      ? notification
      : await this.prisma.notification.update({
          where: { id: notificationId },
          data: { read: true },
        });

    await this.syncHasNotificationsFlag(userId);

    return {
      message: 'Notification marked as read',
      success: true,
      data: this.toDto(updated),
    };
  }

  async markAllRead(userId: string): Promise<ApiResponse<{ updated: number }>> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    await this.syncHasNotificationsFlag(userId);

    return {
      message: 'All notifications marked as read',
      success: true,
      data: { updated: result.count },
    };
  }

  private async syncHasNotificationsFlag(userId: string): Promise<void> {
    const unread = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { hasNotifications: unread > 0 },
    });
  }
}
