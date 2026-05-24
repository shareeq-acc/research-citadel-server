import { ApiProperty } from '@nestjs/swagger';

export class DocumentMetadataDto {
  @ApiProperty({ description: 'Document title from metadata', required: false })
  title?: string;

  @ApiProperty({ description: 'Document author from metadata', required: false })
  author?: string;

  @ApiProperty({ description: 'Number of pages', example: 12 })
  pages: number;

  @ApiProperty({ description: 'Creation date from metadata', required: false })
  createdAt?: Date;

  @ApiProperty({ description: 'Document subject/keywords', required: false })
  subject?: string;

  @ApiProperty({ description: 'PDF producer software', required: false })
  producer?: string;
}

export class DocumentExtractionResultDto {
  @ApiProperty({ description: 'Extracted text content' })
  text: string;

  @ApiProperty({ description: 'Document metadata', type: DocumentMetadataDto })
  metadata: DocumentMetadataDto;

  @ApiProperty({ description: 'Character count of extracted text', example: 45000 })
  characterCount: number;

  @ApiProperty({ description: 'Word count estimate', example: 7500 })
  wordCount: number;
}

export class DocumentSectionDto {
  @ApiProperty({ description: 'Abstract section', required: false })
  abstract?: string;

  @ApiProperty({ description: 'Introduction section', required: false })
  introduction?: string;

  @ApiProperty({ description: 'Methodology/Methods section', required: false })
  methodology?: string;

  @ApiProperty({ description: 'Results/Findings section', required: false })
  results?: string;

  @ApiProperty({ description: 'Discussion section', required: false })
  discussion?: string;

  @ApiProperty({ description: 'Conclusion section', required: false })
  conclusion?: string;

  @ApiProperty({ description: 'References section', required: false })
  references?: string;
}
