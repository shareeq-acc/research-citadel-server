import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { IDocumentProcessor } from './interfaces/document-processor.interface';
import { PdfProcessor } from './processors/pdf.processor';
import { DocumentExtractionResultDto, DocumentSectionDto } from './dto/document-extraction.dto';

@Injectable()
export class DocumentExtractionService {
  private readonly logger = new Logger(DocumentExtractionService.name);
  private readonly processors: IDocumentProcessor[];

  constructor(private readonly pdfProcessor: PdfProcessor) {
    // Register all processors
    this.processors = [this.pdfProcessor];
  }

  /**
   * Extract text from document buffer based on MIME type
   */
  async extractText(buffer: Buffer, mimeType: string): Promise<DocumentExtractionResultDto> {
    const processor = this.getProcessor(mimeType);

    if (!processor) {
      throw new BadRequestException(
        `Unsupported file type: ${mimeType}. Supported types: ${this.getSupportedMimeTypes().join(', ')}`,
      );
    }

    this.logger.log(`Extracting text from ${mimeType} document`);
    return processor.extractText(buffer);
  }

  /**
   * Split text into chunks for AI processing
   * Uses smart chunking: splits by paragraphs, then combines to reach chunk size
   */
  splitTextIntoChunks(text: string, maxChunkSize: number = 4000): string[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

      if (potentialChunk.length > maxChunkSize && currentChunk) {
        // Current chunk is full, save it and start new one
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Extract sections from academic paper using heuristic patterns
   * Looks for common section headers in research papers
   */
  extractSections(text: string): DocumentSectionDto {
    const sections: DocumentSectionDto = {};

    // Common section patterns (case-insensitive)
    const patterns = {
      abstract: /abstract[:\s]+([\s\S]*?)(?=\n\s*\n[A-Z]|introduction|1\.|$)/i,
      introduction: /(?:introduction|1\.?\s+introduction)[:\s]+([\s\S]*?)(?=\n\s*\n[A-Z]|methodology|methods|2\.|$)/i,
      methodology: /(?:methodology|methods|2\.?\s+(?:methodology|methods))[:\s]+([\s\S]*?)(?=\n\s*\n[A-Z]|results|findings|3\.|$)/i,
      results: /(?:results|findings|3\.?\s+(?:results|findings))[:\s]+([\s\S]*?)(?=\n\s*\n[A-Z]|discussion|conclusion|4\.|$)/i,
      discussion: /(?:discussion|4\.?\s+discussion)[:\s]+([\s\S]*?)(?=\n\s*\n[A-Z]|conclusion|5\.|$)/i,
      conclusion: /(?:conclusion|5\.?\s+conclusion)[:\s]+([\s\S]*?)(?=\n\s*\n[A-Z]|references|acknowledgment|$)/i,
      references: /(?:references|bibliography)[:\s]+([\s\S]*?)(?=$)/i,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Limit section length to avoid token limits
        sections[key as keyof DocumentSectionDto] = match[1].trim().substring(0, 3000);
      }
    }

    return sections;
  }

  /**
   * Get processor for given MIME type
   */
  private getProcessor(mimeType: string): IDocumentProcessor | undefined {
    return this.processors.find((processor) => processor.supports(mimeType));
  }

  /**
   * Get all supported MIME types
   */
  getSupportedMimeTypes(): string[] {
    return this.processors.flatMap((processor) => processor.getSupportedMimeTypes());
  }

  /**
   * Check if a MIME type is supported
   */
  isSupported(mimeType: string): boolean {
    return this.processors.some((processor) => processor.supports(mimeType));
  }
}
