import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiResponse } from 'src/common/types';
import { NotificationService } from './notification.service';
import { NotificationDto } from './types';

@Controller('notifications')
@ApiTags('Notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiProperty({ title: 'List Notifications', description: 'Get notifications for the current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @Get()
  async list(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<ApiResponse<NotificationDto[]>> {
    return this.notificationService.listForUser(user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @ApiProperty({ title: 'Unread Count', description: 'Get unread notification count' })
  @Get('unread-count')
  async unreadCount(@CurrentUser() user: User): Promise<ApiResponse<{ count: number }>> {
    return this.notificationService.getUnreadCount(user.id);
  }

  @ApiProperty({ title: 'Mark All Read', description: 'Mark all notifications as read' })
  @Patch('read-all')
  async markAllRead(@CurrentUser() user: User): Promise<ApiResponse<{ updated: number }>> {
    return this.notificationService.markAllRead(user.id);
  }

  @ApiProperty({ title: 'Mark Read', description: 'Mark a single notification as read' })
  @Patch(':id/read')
  async markRead(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiResponse<NotificationDto>> {
    return this.notificationService.markRead(user.id, id);
  }
}
