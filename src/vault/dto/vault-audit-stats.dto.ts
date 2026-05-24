import { ApiProperty } from '@nestjs/swagger';

export class VaultAuditStatsUserDto {
  @ApiProperty({ example: 'uuid', description: 'User ID' })
  id: string;
  @ApiProperty({ description: 'Display name' })
  name: string;
  @ApiProperty({ description: 'Email' })
  email: string;
  @ApiProperty({ nullable: true, description: 'Avatar URL' })
  avatar: string | null;
}

export class UserContributionStatsDto {
  @ApiProperty({ type: VaultAuditStatsUserDto, description: 'User who performed the actions' })
  user: VaultAuditStatsUserDto;
  @ApiProperty({
    type: 'object',
    description: 'Count per audit action (e.g. SOURCE_ADDED, ANNOTATION_ADDED). Only non-zero counts included.',
    example: { SOURCE_ADDED: 5, ANNOTATION_ADDED: 3, SOURCE_UPDATED: 2 },
    additionalProperties: { type: 'number' },
  })
  actionCounts: Record<string, number>;
  @ApiProperty({ description: 'Total number of audit actions by this user in the vault' })
  totalCount: number;
}

export class VaultAuditStatsResponseDto {
  @ApiProperty({
    type: [UserContributionStatsDto],
    description: 'Contribution stats per user (users who have at least one audit action in this vault).',
  })
  data: UserContributionStatsDto[];
}

/** Runtime type for one user contribution stats entry (used by service) */
export type VaultAuditStatsEntry = {
  user: { id: string; name: string; email: string; avatar: string | null };
  actionCounts: Record<string, number>;
  totalCount: number;
};
