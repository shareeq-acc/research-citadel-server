import { HttpStatus, Injectable } from '@nestjs/common';
import { Notification, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { CollaborationGateway } from 'src/collaboration/collaboration.gateway';
import { NotificationDto } from './types';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collaborationGateway: CollaborationGateway,
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

  async createAndPush(input: CreateNotificationInput): Promise<NotificationDto> {
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
    return dto;
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
