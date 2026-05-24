import { ApiProperty } from '@nestjs/swagger';

export class EnhancedMarkdownResponseDto {
  @ApiProperty({ description: 'Enhanced markdown content' })
  enhancedMarkdown: string;
}
