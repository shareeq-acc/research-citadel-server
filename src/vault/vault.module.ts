import { Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [VaultController],
  providers: [VaultService, PrismaService],
  exports: [VaultService],
})
export class VaultModule {}
