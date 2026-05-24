import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { throwError } from 'src/common/utils/helpers';

/** Gemini embedding model — stable GA model */
const EMBEDDING_MODEL = 'gemini-embedding-001';

/**
 * batchEmbedContents limit per request.
 * Keep well under the API limit to avoid 429s.
 */
const BATCH_SIZE = 20;

/** Retry config for 429 / transient errors */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2s base delay, doubles each retry

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (!apiKey.trim()) {
      this.logger.warn('GEMINI_API_KEY is not configured — embeddings will fail');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Generate a single embedding vector for the given text.
   */
  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  /**
   * Generate embeddings for multiple texts using batchEmbedContents.
   * Splits into batches of BATCH_SIZE and retries on transient errors.
   * This is ~20x faster than calling embed() in a loop.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const allEmbeddings: number[][] = [];
    const model = this.genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

    // Process in batches
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      this.logger.log(`Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} (${batch.length} texts)`);

      const batchEmbeddings = await this.embedBatchWithRetry(model, batch);
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  /**
   * Cosine similarity between two vectors (range: -1 to 1, higher = more similar).
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async embedBatchWithRetry(
    model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
    texts: string[],
    attempt = 0,
  ): Promise<number[][]> {
    try {
      const requests = texts.map((text) => ({
        content: { role: 'user', parts: [{ text: text.trim() }] },
      }));

      const result = await model.batchEmbedContents({ requests });

      if (!result.embeddings || result.embeddings.length !== texts.length) {
        throw new Error(`Expected ${texts.length} embeddings, got ${result.embeddings?.length ?? 0}`);
      }

      return result.embeddings.map((e) => {
        if (!e.values || e.values.length === 0) {
          throw new Error('Empty embedding in batch response');
        }
        return e.values;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRateLimit = message.includes('429') || message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate');
      const isTransient = isRateLimit || message.includes('503') || message.includes('500');

      if (isTransient && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        this.logger.warn(`Embedding batch failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms: ${message}`);
        await this.sleep(delay);
        return this.embedBatchWithRetry(model, texts, attempt + 1);
      }

      this.logger.error(`Embedding batch failed permanently: ${message}`);
      throw throwError(`Failed to generate embeddings: ${message}`, HttpStatus.BAD_GATEWAY);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
