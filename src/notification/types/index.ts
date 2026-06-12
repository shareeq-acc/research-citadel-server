import { NotificationType } from '@prisma/client';

export interface NotificationDto {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  description: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
