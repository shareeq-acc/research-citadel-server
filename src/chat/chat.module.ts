import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { CollaborationModule } from 'src/collaboration/collaboration.module';

@Module({
  imports: [CollaborationModule],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
