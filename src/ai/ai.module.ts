import { Module } from '@nestjs/common';
import { GeminiService } from './services/gemini.service';
import { MarkdownEnhanceService } from './services/markdown-enhance.service';
import { SummarizationService } from './services/summarization.service';

@Module({
  providers: [GeminiService, MarkdownEnhanceService, SummarizationService],
  exports: [GeminiService, MarkdownEnhanceService, SummarizationService],
})
export class AiModule {}
