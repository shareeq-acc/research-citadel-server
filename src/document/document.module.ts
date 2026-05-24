import { Module } from '@nestjs/common';
import { DocumentExtractionService } from './document-extraction.service';
import { PdfProcessor } from './processors/pdf.processor';
import { ChunkingService } from './chunking.service';

@Module({
  providers: [DocumentExtractionService, PdfProcessor, ChunkingService],
  exports: [DocumentExtractionService, ChunkingService],
})
export class DocumentModule {}
