import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class EnhanceAnnotationDto {
  @IsString({ message: 'Content markdown must be a string' })
  @ApiProperty({
    type: String,
    required: true,
    description: 'Annotation content in Markdown to enhance (grammar, clarity, structure).',
  })
  contentMarkdown: string;
}

export class EnhancedAnnotationResponseDto {
  @ApiProperty({
    type: String,
    description: 'AI-enhanced markdown content (Gemini).',
  })
  enhancedMarkdown: string;
}
