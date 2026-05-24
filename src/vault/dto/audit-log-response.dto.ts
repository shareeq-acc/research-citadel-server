import { ApiProperty } from '@nestjs/swagger';

/** All audit actions tracked per vault (sources, annotations, files, members, etc.) */
export const AUDIT_ACTIONS = [
  'VAULT_CREATED',
  'VAULT_UPDATED',
  'VAULT_DELETED',
  'MEMBER_ADDED',
  'MEMBER_REMOVED',
  'MEMBER_ROLE_CHANGED',
  'FILE_UPLOADED',
  'FILE_DELETED',
  'SOURCE_ADDED',
  'SOURCE_UPDATED',
  'SOURCE_DELETED',
  'ANNOTATION_ADDED',
  'ANNOTATION_UPDATED',
  'ANNOTATION_DELETED',
  'RELATIONSHIP_CREATED',
  'RELATIONSHIP_DELETED',
] as const;

export class AuditLogUserDto {
  @ApiProperty({ example: 'uuid' })
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  email: string;
  @ApiProperty({ nullable: true })
  avatar: string | null;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  vaultId: string;
  @ApiProperty()
  userId: string;
  @ApiProperty({
    enum: AUDIT_ACTIONS,
    description: 'Action that was performed in the vault (per section: vault, member, file, source, annotation, relationship).',
  })
  action: string;
  @ApiProperty({ nullable: true, description: 'Entity type: vault, member, file, source, annotation, etc.' })
  entityType: string | null;
  @ApiProperty({ nullable: true, description: 'ID of the affected entity' })
  entityId: string | null;
  @ApiProperty({ nullable: true, description: 'Additional context (e.g. old/new values)' })
  details: unknown;
  @ApiProperty({ nullable: true })
  ipAddress: string | null;
  @ApiProperty({ nullable: true })
  userAgent: string | null;
  @ApiProperty()
  createdAt: string;
  @ApiProperty({ type: AuditLogUserDto })
  user: AuditLogUserDto;
}
