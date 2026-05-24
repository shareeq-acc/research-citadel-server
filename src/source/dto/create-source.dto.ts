import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { SourceType } from '@prisma/client';

export class CreateSourceDto {
  @IsString({ message: 'Title must be a string' })
  @MaxLength(500, { message: 'Title must be at most 500 characters' })
  @ApiProperty({ type: String, required: true, example: 'Attention Is All You Need' })
  title: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const t = value.trim();
      if (t === '') return [];
      try {
        return JSON.parse(t);
      } catch {
        return t.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return value;
  })
  @IsArray({ message: 'Authors must be an array' })
  @IsString({ each: true, message: 'Each author must be a string' })
  @ApiProperty({ type: [String], required: false, example: ['Vaswani et al.'] })
  authors?: string[];

  @IsOptional()
  @IsString({ message: 'Publication must be a string' })
  @ApiProperty({ type: String, required: false, example: 'NeurIPS' })
  publication?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : Number(value)))
  @IsInt({ message: 'Year must be an integer' })
  @Min(1900, { message: 'Year must be 1900 or later' })
  @ApiProperty({ type: Number, required: false, example: 2017 })
  year?: number;

  @IsOptional()
  @IsString({ message: 'External URL must be a string' })
  @ApiProperty({ type: String, required: false, example: 'https://arxiv.org/abs/1706.03762' })
  externalUrl?: string;

  @IsOptional()
  @IsEnum(SourceType, { message: 'Source type must be a valid SourceType' })
  @ApiProperty({ type: String, enum: SourceType, required: false, default: SourceType.PDF })
  sourceType?: SourceType;

  @IsOptional()
  @IsUUID('4', { message: 'File ID must be a valid UUID' })
  @ApiProperty({ type: String, required: false, description: 'Link to an existing file in the vault' })
  fileId?: string;

  @IsOptional()
  @IsString({ message: 'Abstract must be a string' })
  @ApiProperty({ type: String, required: false })
  abstract?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const t = value.trim();
      if (t === '') return [];
      try {
        return JSON.parse(t);
      } catch {
        return t.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return value;
  })
  @IsArray({ message: 'Keywords must be an array' })
  @IsString({ each: true })
  @ApiProperty({ type: [String], required: false, example: ['transformers', 'attention'] })
  keywords?: string[];
}
