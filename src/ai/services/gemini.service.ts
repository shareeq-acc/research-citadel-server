import { Injectable, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { throwError } from 'src/common/utils/helpers';
import { AiUsageService } from './ai-usage.service';
import { AiTrackingContext, GeminiTokenUsage } from '../constants/ai-usage.constants';

export interface GeminiGenerationResult {
  text: string;
  usage: GeminiTokenUsage;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiUsageService: AiUsageService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';

    if (!this.apiKey.trim()) {
      this.logger.warn('GEMINI_API_KEY is not configured');
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  getModel(modelName: string = 'gemini-2.5-flash', systemInstruction?: string): GenerativeModel {
    this.ensureConfigured();

    return this.genAI.getGenerativeModel({
      model: modelName,
      ...(systemInstruction && { systemInstruction }),
    });
  }

  /**
   * Generate content with Gemini. When tracking context is provided,
   * enforces quota and records token-based compute usage.
   */
  async generateContent(
    prompt: string,
    systemInstruction?: string,
    tracking?: AiTrackingContext,
  ): Promise<GeminiGenerationResult> {
    this.ensureConfigured();

    if (tracking) {
      await this.aiUsageService.assertQuotaForUser(tracking.userId);
    }

    try {
      const model = this.getModel('gemini-2.5-flash', systemInstruction);
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const response = result.response;
      if (!response?.text) {
        throw new Error('Empty response from Gemini');
      }

      const usageMetadata = response.usageMetadata;
      const usage: GeminiTokenUsage = {
        promptTokens: usageMetadata?.promptTokenCount ?? 0,
        completionTokens: usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens:
          usageMetadata?.totalTokenCount ??
          (usageMetadata?.promptTokenCount ?? 0) + (usageMetadata?.candidatesTokenCount ?? 0),
      };

      if (tracking) {
        await this.aiUsageService.recordUsage(tracking, usage);
      }

      return {
        text: response.text().trim(),
        usage,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      const message = error instanceof Error ? error.message : 'Gemini request failed';
      this.logger.error(`Gemini generation failed: ${message}`, error instanceof Error ? error.stack : String(error));
      throw throwError(`AI generation failed: ${message}`, HttpStatus.BAD_GATEWAY);
    }
  }

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

  isConfigured(): boolean {
    return !!this.apiKey.trim();
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw throwError('AI service is not configured (missing GEMINI_API_KEY)', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
