import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateCitationDto {
  @IsString({ message: 'Citation must be a string' })
  @ApiProperty({ type: String, description: 'Formatted citation string' })
  citation: string;
}
