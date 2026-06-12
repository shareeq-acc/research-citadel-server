import { Global, Module } from '@nestjs/common';
import { CollaborationModule } from 'src/collaboration/collaboration.module';
import { PrismaService } from 'src/common/services/prisma.service';
import { NotificationController } from './notification.controller';
import { NotificationEventBus } from './notification-event.bus';
import { NotificationListener } from './notification.listener';
import { NotificationService } from './notification.service';

@Global()
@Module({
  imports: [CollaborationModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationEventBus,
    NotificationListener,
    PrismaService,
  ],
  exports: [NotificationService, NotificationEventBus],
})
export class NotificationModule {}
