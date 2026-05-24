import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { throwError } from 'src/common/utils/helpers';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    
    if (!this.apiKey.trim()) {
      this.logger.warn('GEMINI_API_KEY is not configured');
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  /**
   * Get Gemini model instance
   */
  getModel(modelName: string = 'gemini-2.5-flash', systemInstruction?: string): GenerativeModel {
    this.ensureConfigured();
    
    return this.genAI.getGenerativeModel({
      model: modelName,
      ...(systemInstruction && { systemInstruction }),
    });
  }

  /**
   * Generate content with Gemini
   */
  async generateContent(prompt: string, systemInstruction?: string): Promise<string> {
    this.ensureConfigured();

    try {
      const model = this.getModel('gemini-2.5-flash', systemInstruction);
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const response = result.response;
      if (!response?.text) {
        throw new Error('Empty response from Gemini');
      }

      return response.text().trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini request failed';
      this.logger.error(`Gemini generation failed: ${message}`, error instanceof Error ? error.stack : String(error));
      throw throwError(`AI generation failed: ${message}`, HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * Generate content with streaming (for future use)
   */
  async generateContentStream(prompt: string, systemInstruction?: string): Promise<AsyncGenerator<string>> {
    this.ensureConfigured();

    const model = this.getModel('gemini-2.5-flash', systemInstruction);
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    async function* streamGenerator() {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    }

    return streamGenerator();
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey.trim();
  }

  /**
   * Ensure API key is configured, throw error if not
   */
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw throwError(
        'AI service is not configured (missing GEMINI_API_KEY)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
