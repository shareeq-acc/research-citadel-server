import { Module } from '@nestjs/common';
import { AnnotationController } from './annotation.controller';
import { AnnotationService } from './annotation.service';
import { GeminiEnhanceService } from './gemini-enhance.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { CollaborationModule } from 'src/collaboration/collaboration.module';

@Module({
  imports: [CollaborationModule],
  controllers: [AnnotationController],
  providers: [AnnotationService, GeminiEnhanceService, PrismaService],
  exports: [AnnotationService],
})
export class AnnotationModule {}
