import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppLoggerService } from 'src/common/services/logger.service';
import { throwError } from 'src/common/utils/helpers';

const ENHANCE_SYSTEM_PROMPT = `You are an expert research assistant that enhances academic annotation notes written in Markdown.

Your task is to improve the given markdown content while making it well-structured, pleasant to read, and professionally formatted.

Guidelines:
1. **Grammar & Clarity**: Fix grammar, spelling, and improve sentence flow
2. **Structure**: Organize content with proper headings (##, ###) where appropriate
3. **Formatting**: Use markdown features effectively:
   - Bold (**text**) for emphasis
   - Italic (*text*) for subtle emphasis
   - Bullet points (-) for lists
   - Numbered lists (1.) for sequential items
   - Code blocks (\`\`\`) for technical content
   - Blockquotes (>) for important quotes or highlights
4. **Readability**: Add line breaks between sections for better visual separation
5. **Preservation**: Keep the original meaning and intent; don't add new information
6. **Output**: Return ONLY the enhanced markdown content, no explanations or preamble

The result should be clean, professional, and ready to use as a research annotation.`;

@Injectable()
export class GeminiEnhanceService {
  private readonly logger = new AppLoggerService(GeminiEnhanceService.name);

  constructor(private readonly configService: ConfigService) {}

  async enhanceMarkdown(contentMarkdown: string): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey?.trim()) {
      this.logger.warn('GEMINI_API_KEY is not set');
      throw throwError(
        'AI enhance is not configured (missing GEMINI_API_KEY)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const trimmed = contentMarkdown?.trim() ?? '';
    if (!trimmed) {
      throw throwError('Content is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: ENHANCE_SYSTEM_PROMPT,
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: trimmed }] }],
      });
      const response = result.response;
      if (!response?.text) {
        throw new Error('Empty response from Gemini');
      }
      return response.text().trim();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gemini request failed';
      this.logger.error('Gemini enhance failed', err instanceof Error ? err.stack : String(err), GeminiEnhanceService.name);
      throw throwError(message, HttpStatus.BAD_GATEWAY);
    }
  }
}
