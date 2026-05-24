import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { throwError } from 'src/common/utils/helpers';
import { GeminiService } from './gemini.service';
import { QaAnswerDto, CitedSourceDto } from '../dto/qa.dto';
import { QA_SYSTEM_INSTRUCTION, buildQaPrompt } from '../prompts/qa.prompt';

/** Number of top chunks to pass as context */
const TOP_K = 5;
/** Minimum TF-IDF similarity to include a chunk */
const MIN_SIMILARITY = 0.05;

@Injectable()
export class QaService {
  private readonly logger = new Logger(QaService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * Answer a question using RAG over the vault's processed sources.
   * Uses TF-IDF cosine similarity for retrieval — no embedding API calls.
   */
  async answerQuestion(
    vaultId: string,
    question: string,
    sourceIds?: string[],
  ): Promise<QaAnswerDto> {
    // 1. Fetch all chunks for this vault
    const chunks = await this.prismaService.sourceChunk.findMany({
      where: {
        vaultId,
        ...(sourceIds?.length ? { sourceId: { in: sourceIds } } : {}),
      },
      select: {
        id: true,
        chunkText: true,
        chunkIndex: true,
        sourceId: true,
        source: { select: { id: true, title: true } },
      },
    });

    if (chunks.length === 0) {
      throw throwError(
        'No processed sources found. Please process sources for Q&A first using the "Process for Q&A" button.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Score each chunk using TF-IDF cosine similarity against the question
    this.logger.log(`Scoring ${chunks.length} chunks against question`);
    const texts = chunks.map((c) => c.chunkText);
    const scores = this.tfidfScore(question, texts);

    const scored = chunks
      .map((chunk, i) => ({ chunk, similarity: scores[i] }))
      .filter((item) => item.similarity >= MIN_SIMILARITY)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, TOP_K);

    // Fall back to top-K by any score if nothing passes the threshold
    const finalScored = scored.length > 0
      ? scored
      : chunks
          .map((chunk, i) => ({ chunk, similarity: scores[i] }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, Math.min(TOP_K, chunks.length));

    // 3. Build context for the prompt
    const contextChunks = finalScored.map(({ chunk }) => ({
      text: chunk.chunkText,
      sourceTitle: chunk.source.title,
      chunkIndex: chunk.chunkIndex,
    }));

    // 4. Generate answer with Gemini
    this.logger.log(`Generating answer from ${finalScored.length} context chunks`);
    const prompt = buildQaPrompt(question, contextChunks);
    const answer = await this.geminiService.generateContent(prompt, QA_SYSTEM_INSTRUCTION);

    // 5. Build cited sources (deduplicated, best score per source)
    const sourceMap = new Map<string, CitedSourceDto>();
    for (const { chunk, similarity } of finalScored) {
      const existing = sourceMap.get(chunk.sourceId);
      if (!existing || similarity > existing.similarity) {
        sourceMap.set(chunk.sourceId, {
          sourceId: chunk.source.id,
          title: chunk.source.title,
          similarity: Math.round(similarity * 100) / 100,
        });
      }
    }

    return {
      answer,
      sources: Array.from(sourceMap.values()).sort((a, b) => b.similarity - a.similarity),
      chunksUsed: finalScored.length,
    };
  }

  // ─── TF-IDF helpers ─────────────────────────────────────────────────────────

  /**
   * Score each document against the query using TF-IDF cosine similarity.
   * Returns an array of scores in the same order as `documents`.
   */
  private tfidfScore(query: string, documents: string[]): number[] {
    const allDocs = [query, ...documents];
    const tokenized = allDocs.map((d) => this.tokenize(d));

    // Build vocabulary
    const vocab = new Set<string>();
    tokenized.forEach((tokens) => tokens.forEach((t) => vocab.add(t)));
    const terms = Array.from(vocab);

    // IDF: log((N + 1) / (df + 1)) + 1  (smoothed)
    const N = documents.length;
    const idf = new Map<string, number>();
    for (const term of terms) {
      const df = tokenized.slice(1).filter((tokens) => tokens.includes(term)).length;
      idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
    }

    // TF-IDF vectors
    const vectors = tokenized.map((tokens) => {
      const tf = new Map<string, number>();
      tokens.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
      return terms.map((term) => (tf.get(term) ?? 0) * (idf.get(term) ?? 0));
    });

    const queryVec = vectors[0];
    const docVecs = vectors.slice(1);

    return docVecs.map((docVec) => this.cosine(queryVec, docVec));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  }

  private cosine(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}

// Common English stop words to ignore during tokenization
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'this','that','these','those','it','its','we','our','you','your','they',
  'their','he','his','she','her','not','no','nor','so','yet','both','either',
  'each','few','more','most','other','some','such','than','too','very','just',
  'can','also','into','about','as','if','then','than','when','where','which',
  'who','whom','how','all','any','there','what','up','out','over','after',
]);
