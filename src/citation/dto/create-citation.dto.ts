import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { CitationFormat } from '@prisma/client';

export class CreateCitationDto {
  @IsEnum(CitationFormat, { message: 'Format must be a valid CitationFormat' })
  @ApiProperty({ type: String, enum: CitationFormat, description: 'Citation format (APA, MLA, CHICAGO, etc.)' })
  format: CitationFormat;

  @IsString({ message: 'Citation must be a string' })
  @ApiProperty({ type: String, description: 'Formatted citation string' })
  citation: string;
}
