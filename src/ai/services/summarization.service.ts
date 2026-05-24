import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { throwError } from 'src/common/utils/helpers';
import { GeminiService } from './gemini.service';
import { SummaryLength } from '../dto/summarization.dto';
import {
  SUMMARIZATION_SYSTEM_INSTRUCTION,
  generateFullTextSummaryPrompt,
  generateSectionBasedSummaryPrompt,
  generateChunkSummaryPrompt,
  generateCombineSummariesPrompt,
} from '../prompts/summarization.prompt';

/**
 * Maximum characters to process in a single request
 * Gemini 2.5 Flash has ~1M token context, but we'll be conservative
 */
const MAX_CHARS_PER_REQUEST = 100000; // ~25k words
const CHUNK_SIZE = 80000; // ~20k words per chunk
const CHUNK_OVERLAP = 2000; // Small overlap to maintain context

interface SummarizationMetadata {
  title?: string;
  authors?: string[];
  year?: number;
}

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Generate a summary of the given text
   * Automatically handles large documents with chunking
   */
  async generateSummary(
    text: string,
    length: SummaryLength = SummaryLength.MEDIUM,
    metadata?: SummarizationMetadata,
  ): Promise<string> {
    if (!text || text.trim().length === 0) {
      throw throwError('Cannot summarize empty text', HttpStatus.BAD_REQUEST);
    }

    const trimmedText = text.trim();
    this.logger.log(`Generating ${length} summary for text with ${trimmedText.length} characters`);

    try {
      // For small to medium documents, use direct summarization
      if (trimmedText.length <= MAX_CHARS_PER_REQUEST) {
        return await this.generateDirectSummary(trimmedText, length, metadata);
      }

      // For large documents, use chunked summarization
      this.logger.log('Text is large, using chunked summarization approach');
      return await this.generateChunkedSummary(trimmedText, length, metadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Summarization failed';
      this.logger.error(`Summarization failed: ${message}`, error instanceof Error ? error.stack : String(error));
      throw throwError(`Failed to generate summary: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Generate summary directly (for documents under the size limit)
   */
  private async generateDirectSummary(
    text: string,
    length: SummaryLength,
    metadata?: SummarizationMetadata,
  ): Promise<string> {
    // Use section-based approach for better accuracy
    const prompt = generateSectionBasedSummaryPrompt(text, length, metadata);
    
    const summary = await this.geminiService.generateContent(
      prompt,
      SUMMARIZATION_SYSTEM_INSTRUCTION,
    );

    return summary;
  }

  /**
   * Generate summary for large documents using chunking
   */
  private async generateChunkedSummary(
    text: string,
    length: SummaryLength,
    metadata?: SummarizationMetadata,
  ): Promise<string> {
    // Split text into overlapping chunks
    const chunks = this.splitIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);
    this.logger.log(`Split text into ${chunks.length} chunks`);

    // Generate summary for each chunk
    const chunkSummaries: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      this.logger.log(`Summarizing chunk ${i + 1}/${chunks.length}`);
      const chunkPrompt = generateChunkSummaryPrompt(chunks[i], i, chunks.length);
      const chunkSummary = await this.geminiService.generateContent(
        chunkPrompt,
        SUMMARIZATION_SYSTEM_INSTRUCTION,
      );
      chunkSummaries.push(chunkSummary);
    }

    // Combine chunk summaries into final summary
    this.logger.log('Combining chunk summaries into final summary');
    const combinePrompt = generateCombineSummariesPrompt(chunkSummaries, length, metadata);
    const finalSummary = await this.geminiService.generateContent(
      combinePrompt,
      SUMMARIZATION_SYSTEM_INSTRUCTION,
    );

    return finalSummary;
  }

  /**
   * Split text into overlapping chunks
   */
  private splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.substring(start, end);

      // Try to break at a sentence boundary if not at the end
      if (end < text.length) {
        const lastPeriod = chunk.lastIndexOf('. ');
        const lastNewline = chunk.lastIndexOf('\n\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > chunkSize * 0.7) {
          // Only break if we're at least 70% through the chunk
          chunk = chunk.substring(0, breakPoint + 1);
        }
      }

      chunks.push(chunk.trim());

      // Move start position with overlap
      start += chunk.length - overlap;
      
      // Ensure we make progress even if chunk is very small
      if (start <= chunks[chunks.length - 1].length) {
        start = chunks[chunks.length - 1].length + 1;
      }
    }

    return chunks;
  }

  /**
   * Estimate word count from text
   */
  estimateWordCount(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }
}
