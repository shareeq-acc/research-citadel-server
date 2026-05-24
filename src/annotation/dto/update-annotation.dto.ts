import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateAnnotationDto {
  @IsOptional()
  @IsString({ message: 'Content markdown must be a string' })
  @ApiProperty({ type: String, required: false })
  contentMarkdown?: string;

  @IsOptional()
  @IsString({ message: 'Content HTML must be a string' })
  @ApiProperty({ type: String, required: false })
  contentHtml?: string;

  @IsOptional()
  @IsInt({ message: 'Page reference must be an integer' })
  @Min(1, { message: 'Page reference must be at least 1' })
  @ApiProperty({ type: Number, required: false })
  pageReference?: number;

  @IsOptional()
  @IsString({ message: 'Section reference must be a string' })
  @ApiProperty({ type: String, required: false })
  sectionReference?: string;
}
