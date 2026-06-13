import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { CollaborationModule } from 'src/collaboration/collaboration.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [CollaborationModule, NotificationModule],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
