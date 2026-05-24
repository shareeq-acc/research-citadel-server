import { Module } from '@nestjs/common';
import { SourceController } from './source.controller';
import { SourceService } from './source.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { StorageModule } from 'src/storage/storage.module';
import { CollaborationModule } from 'src/collaboration/collaboration.module';
import { DocumentModule } from 'src/document/document.module';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [StorageModule, CollaborationModule, DocumentModule, AiModule],
  controllers: [SourceController],
  providers: [SourceService, PrismaService],
  exports: [SourceService],
})
export class SourceModule {}
