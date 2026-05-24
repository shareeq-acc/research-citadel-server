import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { SourceType } from '@prisma/client';

export class UpdateSourceDto {
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MaxLength(500, { message: 'Title must be at most 500 characters' })
  @ApiProperty({ type: String, required: false, example: 'Attention Is All You Need' })
  title?: string;

  @IsOptional()
  @IsArray({ message: 'Authors must be an array' })
  @IsString({ each: true, message: 'Each author must be a string' })
  @ApiProperty({ type: [String], required: false })
  authors?: string[];

  @IsOptional()
  @IsString({ message: 'Publication must be a string' })
  @ApiProperty({ type: String, required: false })
  publication?: string;

  @IsOptional()
  @IsInt({ message: 'Year must be an integer' })
  @Min(1900, { message: 'Year must be 1900 or later' })
  @ApiProperty({ type: Number, required: false })
  year?: number;

  @IsOptional()
  @IsString({ message: 'External URL must be a string' })
  @ApiProperty({ type: String, required: false })
  externalUrl?: string;

  @IsOptional()
  @IsEnum(SourceType, { message: 'Source type must be a valid SourceType' })
  @ApiProperty({ type: String, enum: SourceType, required: false })
  sourceType?: SourceType;

  @IsOptional()
  @IsUUID('4', { message: 'File ID must be a valid UUID' })
  @ApiProperty({ type: String, required: false })
  fileId?: string;

  @IsOptional()
  @IsBoolean({ message: 'AI extracted must be a boolean' })
  @ApiProperty({ type: Boolean, required: false })
  aiExtracted?: boolean;

  @IsOptional()
  @IsString({ message: 'Abstract must be a string' })
  @ApiProperty({ type: String, required: false })
  abstract?: string;

  @IsOptional()
  @IsArray({ message: 'Keywords must be an array' })
  @IsString({ each: true })
  @ApiProperty({ type: [String], required: false })
  keywords?: string[];
}
