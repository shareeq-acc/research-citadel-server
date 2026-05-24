import { Injectable, Logger } from '@nestjs/common';
import { IDocumentProcessor } from '../interfaces/document-processor.interface';
import { DocumentExtractionResultDto, DocumentMetadataDto } from '../dto/document-extraction.dto';

// pdf-parse@1.1.1 uses CommonJS and exports a function directly
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

@Injectable()
export class PdfProcessor implements IDocumentProcessor {
  private readonly logger = new Logger(PdfProcessor.name);

  /**
   * Extract text and metadata from PDF buffer
   */
  async extractText(buffer: Buffer): Promise<DocumentExtractionResultDto> {
    try {
      const data = await pdfParse(buffer);

      const metadata: DocumentMetadataDto = {
        title: data.info?.Title || undefined,
        author: data.info?.Author || undefined,
        pages: data.numpages,
        createdAt: data.info?.CreationDate ? this.parsePdfDate(data.info.CreationDate) : undefined,
        subject: data.info?.Subject || undefined,
        producer: data.info?.Producer || undefined,
      };

      const text = data.text || '';
      const wordCount = this.estimateWordCount(text);

      return {
        text,
        metadata,
        characterCount: text.length,
        wordCount,
      };
    } catch (error) {
      this.logger.error(`PDF extraction failed: ${error.message}`, error.stack);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Check if this processor supports the given MIME type
   */
  supports(mimeType: string): boolean {
    return this.getSupportedMimeTypes().includes(mimeType);
  }

  /**
   * Get supported MIME types
   */
  getSupportedMimeTypes(): string[] {
    return ['application/pdf'];
  }

  /**
   * Parse PDF date format (D:YYYYMMDDHHmmSS)
   */
  private parsePdfDate(pdfDate: string): Date | undefined {
    try {
      // PDF date format: D:YYYYMMDDHHmmSS+HH'mm'
      const match = pdfDate.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second),
        );
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Estimate word count from text
   */
  private estimateWordCount(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }
}
