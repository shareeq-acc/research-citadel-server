import { DocumentExtractionResultDto } from '../dto/document-extraction.dto';

/**
 * Interface for document processors (PDF, DOCX, etc.)
 * Allows easy extension for new file types
 */
export interface IDocumentProcessor {
  /**
   * Extract text and metadata from document buffer
   */
  extractText(buffer: Buffer): Promise<DocumentExtractionResultDto>;

  /**
   * Check if this processor supports the given MIME type
   */
  supports(mimeType: string): boolean;

  /**
   * Get supported MIME types
   */
  getSupportedMimeTypes(): string[];
}
