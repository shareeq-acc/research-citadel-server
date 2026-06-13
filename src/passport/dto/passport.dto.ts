import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePassportDto {
  @ApiPropertyOptional({ description: 'Display name / alias within this vault', maxLength: 48 })
  @IsOptional()
  @IsString()
  @MaxLength(48)
  vaultAlias?: string;

  @ApiPropertyOptional({ description: 'Specialization or role title within the vault', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  role?: string;

  @ApiPropertyOptional({ description: 'Vault-specific motto', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  motto?: string;
}

export class PassportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  barcode: string;

  @ApiPropertyOptional()
  vaultAlias: string | null;

  @ApiPropertyOptional()
  role: string | null;

  @ApiPropertyOptional()
  motto: string | null;

  @ApiProperty({ description: 'Resolved alias (vault alias or user name)' })
  displayAlias: string;

  @ApiProperty({ description: 'Resolved motto (passport motto or user motto)' })
  displayMotto: string;

  @ApiProperty({ description: 'User full name' })
  agentName: string;

  @ApiProperty()
  memberRole: string;

  @ApiProperty()
  vaultId: string;

  @ApiProperty()
  vaultName: string;

  @ApiProperty()
  joinedAt: string;

  @ApiPropertyOptional()
  userAvatar: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class PassportVerificationDto extends PassportResponseDto {
  @ApiProperty()
  verified: boolean;

  @ApiProperty()
  verificationMessage: string;

  @ApiProperty()
  isActiveMember: boolean;

  @ApiProperty()
  vaultExists: boolean;
}
