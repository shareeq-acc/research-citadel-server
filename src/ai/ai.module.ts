import { Module } from '@nestjs/common';
import { GeminiService } from './services/gemini.service';
import { MarkdownEnhanceService } from './services/markdown-enhance.service';
import { SummarizationService } from './services/summarization.service';
import { InsightsService } from './services/insights.service';

@Module({
  providers: [GeminiService, MarkdownEnhanceService, SummarizationService, InsightsService],
  exports: [GeminiService, MarkdownEnhanceService, SummarizationService, InsightsService],
})
export class AiModule {}
