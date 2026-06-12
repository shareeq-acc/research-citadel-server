import { Injectable, HttpStatus } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { MARKDOWN_ENHANCE_PROMPT } from '../prompts/markdown-enhance.prompt';
import { throwError } from 'src/common/utils/helpers';
import { buildTracking } from '../utils/tracking.util';

@Injectable()
export class MarkdownEnhanceService {
  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Enhance markdown content using AI
   * Improves grammar, structure, and formatting while preserving meaning
   */
  async enhanceMarkdown(
    userId: string,
    contentMarkdown: string,
    metadata?: { vaultId?: string; sourceId?: string },
  ): Promise<string> {
    const trimmed = contentMarkdown?.trim() ?? '';

    if (!trimmed) {
      throw throwError('Content is required', HttpStatus.BAD_REQUEST);
    }

    const tracking = buildTracking(userId, 'MARKDOWN_ENHANCE', metadata);
    const result = await this.geminiService.generateContent(trimmed, MARKDOWN_ENHANCE_PROMPT, tracking);
    return result.text;
  }
}
