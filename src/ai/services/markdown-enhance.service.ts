import { Injectable, HttpStatus } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { MARKDOWN_ENHANCE_PROMPT } from '../prompts/markdown-enhance.prompt';
import { throwError } from 'src/common/utils/helpers';

@Injectable()
export class MarkdownEnhanceService {
  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Enhance markdown content using AI
   * Improves grammar, structure, and formatting while preserving meaning
   */
  async enhanceMarkdown(contentMarkdown: string): Promise<string> {
    const trimmed = contentMarkdown?.trim() ?? '';
    
    if (!trimmed) {
      throw throwError('Content is required', HttpStatus.BAD_REQUEST);
    }

    return this.geminiService.generateContent(trimmed, MARKDOWN_ENHANCE_PROMPT);
  }
}
