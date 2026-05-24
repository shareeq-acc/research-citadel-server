import { Module } from '@nestjs/common';
import { CitationController } from './citation.controller';
import { CitationService } from './citation.service';
import { PrismaService } from 'src/common/services/prisma.service';

@Module({
  controllers: [CitationController],
  providers: [CitationService, PrismaService],
  exports: [CitationService],
})
export class CitationModule {}
