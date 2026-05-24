import { Module } from '@nestjs/common';
import { GeminiService } from './services/gemini.service';
import { MarkdownEnhanceService } from './services/markdown-enhance.service';
import { SummarizationService } from './services/summarization.service';
import { InsightsService } from './services/insights.service';
import { EmbeddingService } from './services/embedding.service';
import { QaService } from './services/qa.service';
import { PrismaService } from 'src/common/services/prisma.service';

@Module({
  providers: [GeminiService, MarkdownEnhanceService, SummarizationService, InsightsService, EmbeddingService, QaService, PrismaService],
  exports: [GeminiService, MarkdownEnhanceService, SummarizationService, InsightsService, EmbeddingService, QaService],
})
export class AiModule {}
