import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { throwError } from 'src/common/utils/helpers';
import { GeminiService } from './gemini.service';
import { InsightsDto } from '../dto/insights.dto';
import {
  INSIGHTS_SYSTEM_INSTRUCTION,
  generateInsightsPrompt,
  generateChunkInsightsPrompt,
  generateMergeInsightsPrompt,
} from '../prompts/insights.prompt';

const MAX_CHARS_DIRECT = 100000; // ~25k words — process directly under this
const CHUNK_SIZE = 80000;
const CHUNK_OVERLAP = 2000;

interface InsightsMetadata {
  title?: string;
  authors?: string[];
  year?: number;
}

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Extract structured insights from document text.
   * Automatically handles large documents via chunking.
   */
  async extractInsights(text: string, metadata?: InsightsMetadata): Promise<InsightsDto> {
    if (!text?.trim()) {
      throw throwError('Cannot extract insights from empty text', HttpStatus.BAD_REQUEST);
    }

    const trimmed = text.trim();
    this.logger.log(`Extracting insights from ${trimmed.length} characters`);

    try {
      if (trimmed.length <= MAX_CHARS_DIRECT) {
        return await this.extractDirect(trimmed, metadata);
      }

      this.logger.log('Document is large — using chunked extraction');
      return await this.extractChunked(trimmed, metadata);
    } catch (error) {
      // Re-throw known HTTP errors as-is
      if (error?.status) throw error;
      const message = error instanceof Error ? error.message : 'Insights extraction failed';
      this.logger.error(`Insights extraction failed: ${message}`, error instanceof Error ? error.stack : String(error));
      throw throwError(`Failed to extract insights: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async extractDirect(text: string, metadata?: InsightsMetadata): Promise<InsightsDto> {
    const prompt = generateInsightsPrompt(text, metadata);
    const raw = await this.geminiService.generateContent(prompt, INSIGHTS_SYSTEM_INSTRUCTION);
    return this.parseAndValidate(raw);
  }

  private async extractChunked(text: string, metadata?: InsightsMetadata): Promise<InsightsDto> {
    const chunks = this.splitIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);
    this.logger.log(`Split into ${chunks.length} chunks`);

    const partialResults: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      this.logger.log(`Processing chunk ${i + 1}/${chunks.length}`);
      const prompt = generateChunkInsightsPrompt(chunks[i], i, chunks.length);
      const raw = await this.geminiService.generateContent(prompt, INSIGHTS_SYSTEM_INSTRUCTION);
      partialResults.push(raw);
    }

    this.logger.log('Merging partial insights');
    const mergePrompt = generateMergeInsightsPrompt(partialResults, metadata);
    const merged = await this.geminiService.generateContent(mergePrompt, INSIGHTS_SYSTEM_INSTRUCTION);
    return this.parseAndValidate(merged);
  }

  /**
   * Parse the AI response as JSON and validate/normalise the shape.
   * Strips markdown code fences if the model accidentally includes them.
   */
  private parseAndValidate(raw: string): InsightsDto {
    // Strip ```json ... ``` or ``` ... ``` wrappers if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      this.logger.error(`Failed to parse insights JSON. Raw response:\n${raw}`);
      throw throwError(
        'AI returned malformed JSON for insights. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Normalise — fill missing fields with safe defaults
    return {
      researchProblem: this.ensureString(parsed.researchProblem),
      methodology: this.ensureString(parsed.methodology),
      keyFindings: this.ensureFindings(parsed.keyFindings),
      limitations: this.ensureStringArray(parsed.limitations),
      futureWork: this.ensureStringArray(parsed.futureWork),
      contributions: this.ensureStringArray(parsed.contributions),
      datasets: this.ensureStringArray(parsed.datasets),
    };
  }

  private ensureString(value: unknown): string {
    if (typeof value === 'string' && value.trim()) return value.trim();
    return 'Not specified';
  }

  private ensureStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((v) => typeof v === 'string' && v.trim())
      .map((v) => (v as string).trim());
  }

  private ensureFindings(value: unknown): InsightsDto['keyFindings'] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((v) => v && typeof v === 'object' && typeof v.finding === 'string')
      .map((v) => ({
        finding: (v.finding as string).trim(),
        significance: (['High', 'Medium', 'Low'].includes(v.significance)
          ? v.significance
          : 'Medium') as 'High' | 'Medium' | 'Low',
      }));
  }

  private splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.substring(start, end);

      if (end < text.length) {
        const lastPeriod = chunk.lastIndexOf('. ');
        const lastNewline = chunk.lastIndexOf('\n\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        if (breakPoint > chunkSize * 0.7) {
          chunk = chunk.substring(0, breakPoint + 1);
        }
      }

      chunks.push(chunk.trim());
      start += chunk.length - overlap;
      if (start <= 0) start = chunk.length + 1; // safety guard
    }

    return chunks;
  }
}
