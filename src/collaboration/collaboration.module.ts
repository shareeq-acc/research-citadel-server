import { Module } from '@nestjs/common';
import { CollaborationGateway } from './collaboration.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';

@Module({
  providers: [
    CollaborationGateway,
    WsJwtGuard,
    PrismaService,
    {
      provide: AppLoggerService,
      useFactory: () => new AppLoggerService(CollaborationGateway.name),
    },
  ],
  exports: [CollaborationGateway],
})
export class CollaborationModule {}
