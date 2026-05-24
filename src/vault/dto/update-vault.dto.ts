import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VaultPrivacy } from '@prisma/client';

export class UpdateVaultDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(255, { message: 'Name must be at most 255 characters' })
  @ApiProperty({ type: String, required: false, example: 'My Research Vault' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @ApiProperty({ type: String, required: false, example: 'Vault for AI research papers' })
  description?: string;

  @IsOptional()
  @IsEnum(VaultPrivacy, { message: 'Privacy must be PRIVATE or PUBLIC' })
  @ApiProperty({ type: String, enum: VaultPrivacy, required: false })
  privacy?: VaultPrivacy;
}
