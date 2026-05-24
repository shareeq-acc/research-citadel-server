import { Module } from '@nestjs/common';
import { DocumentExtractionService } from './document-extraction.service';
import { PdfProcessor } from './processors/pdf.processor';

@Module({
  providers: [DocumentExtractionService, PdfProcessor],
  exports: [DocumentExtractionService],
})
export class DocumentModule {}
