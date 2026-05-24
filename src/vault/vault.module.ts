import { Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { CollaborationModule } from 'src/collaboration/collaboration.module';

@Module({
  imports: [CollaborationModule],
  controllers: [VaultController],
  providers: [VaultService, PrismaService],
  exports: [VaultService],
})
export class VaultModule {}
