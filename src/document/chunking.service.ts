import { Injectable, Logger } from '@nestjs/common';

export interface TextChunk {
  text: string;
  index: number;
  pageNumber?: number;
}

/**
 * Larger chunks = fewer API calls = much faster processing.
 * ~800-1000 words per chunk is the sweet spot for RAG quality vs speed.
 * gemini-embedding-001 supports up to 2048 tokens (~1500 words).
 */
const CHUNK_SIZE = 6000;   // ~1200-1500 words per chunk
const CHUNK_OVERLAP = 400; // ~80 words overlap for context continuity

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  /**
   * Split document text into overlapping chunks suitable for embedding.
   * Tries to break at paragraph or sentence boundaries.
   */
  chunkText(text: string): TextChunk[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < trimmed.length) {
      const end = Math.min(start + CHUNK_SIZE, trimmed.length);
      let chunkText = trimmed.substring(start, end);

      // Try to break at a natural boundary if not at the end
      if (end < trimmed.length) {
        const lastParagraph = chunkText.lastIndexOf('\n\n');
        const lastSentence = chunkText.lastIndexOf('. ');
        const breakPoint = lastParagraph > CHUNK_SIZE * 0.6
          ? lastParagraph
          : lastSentence > CHUNK_SIZE * 0.6
          ? lastSentence + 1
          : -1;

        if (breakPoint > 0) {
          chunkText = chunkText.substring(0, breakPoint).trim();
        }
      }

      chunkText = chunkText.trim();
      if (chunkText.length > 0) {
        chunks.push({ text: chunkText, index });
        index++;
      }

      // Advance with overlap
      start += Math.max(chunkText.length - CHUNK_OVERLAP, 1);
    }

    this.logger.log(`Chunked text into ${chunks.length} chunks`);
    return chunks;
  }
}
