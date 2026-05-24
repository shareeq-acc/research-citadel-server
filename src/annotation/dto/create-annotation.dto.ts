import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAnnotationDto {
  @IsString({ message: 'Content markdown must be a string' })
  @ApiProperty({ type: String, required: true, description: 'Annotation content in Markdown' })
  contentMarkdown: string;

  @IsOptional()
  @IsString({ message: 'Content HTML must be a string' })
  @ApiProperty({
    type: String,
    required: false,
    description: 'Rendered HTML (cached). If omitted, contentMarkdown is stored as-is.',
  })
  contentHtml?: string;

  @IsOptional()
  @IsInt({ message: 'Page reference must be an integer' })
  @Min(1, { message: 'Page reference must be at least 1' })
  @ApiProperty({ type: Number, required: false, description: 'PDF page number' })
  pageReference?: number;

  @IsOptional()
  @IsString({ message: 'Section reference must be a string' })
  @ApiProperty({ type: String, required: false, description: 'Section or chapter reference' })
  sectionReference?: string;
}
