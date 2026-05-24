import { Module } from '@nestjs/common';
import { GeminiService } from './services/gemini.service';
import { MarkdownEnhanceService } from './services/markdown-enhance.service';

@Module({
  providers: [GeminiService, MarkdownEnhanceService],
  exports: [GeminiService, MarkdownEnhanceService],
})
export class AiModule {}
