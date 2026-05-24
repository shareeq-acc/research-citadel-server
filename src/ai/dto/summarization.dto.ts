import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * Summary length options
 */
export enum SummaryLength {
  SHORT = 'short',   // ~100-150 words
  MEDIUM = 'medium', // ~250-350 words
  LONG = 'long',     // ~500-700 words
}

/**
 * Request DTO for generating a summary
 */
export class GenerateSummaryDto {
  @ApiProperty({
    enum: SummaryLength,
    default: SummaryLength.MEDIUM,
    description: 'Desired summary length',
    example: SummaryLength.MEDIUM,
  })
  @IsEnum(SummaryLength)
  @IsOptional()
  length?: SummaryLength = SummaryLength.MEDIUM;
}

/**
 * Response DTO for generated summary
 */
export class SummaryResponseDto {
  @ApiProperty({
    description: 'Generated summary text',
    example: 'This paper introduces the Transformer architecture...',
  })
  summary: string;

  @ApiProperty({
    description: 'Summary length category',
    enum: SummaryLength,
    example: SummaryLength.MEDIUM,
  })
  length: SummaryLength;

  @ApiProperty({
    description: 'Word count of the summary',
    example: 287,
  })
  wordCount: number;

  @ApiProperty({
    description: 'When the summary was generated',
    example: '2026-05-25T10:30:00Z',
  })
  generatedAt: Date;
}
