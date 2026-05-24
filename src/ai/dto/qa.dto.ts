import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID, MaxLength } from 'class-validator';

export class AskQuestionDto {
  @ApiProperty({
    description: 'The question to ask about the vault sources',
    example: 'What methodology did the Transformer paper use?',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question: string;

  @ApiProperty({
    description: 'Optional: limit search to specific source IDs',
    type: [String],
    required: false,
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sourceIds?: string[];
}

export class CitedSourceDto {
  @ApiProperty({ example: 'uuid-source-1' })
  sourceId: string;

  @ApiProperty({ example: 'Attention Is All You Need' })
  title: string;

  @ApiProperty({ example: 0.92, description: 'Similarity score (0–1)' })
  similarity: number;
}

export class QaAnswerDto {
  @ApiProperty({ description: 'The AI-generated answer' })
  answer: string;

  @ApiProperty({ description: 'Sources cited in the answer', type: [CitedSourceDto] })
  sources: CitedSourceDto[];

  @ApiProperty({ description: 'Number of context chunks used' })
  chunksUsed: number;
}
