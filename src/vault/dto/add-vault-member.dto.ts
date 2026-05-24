import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { VaultRole } from '@prisma/client';

export class AddVaultMemberDto {
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  @ApiProperty({ type: String, format: 'uuid', description: 'User ID to add as member' })
  userId: string;

  @IsEnum(VaultRole, { message: 'role must be OWNER, CONTRIBUTOR, or VIEWER' })
  @ApiProperty({ type: String, enum: VaultRole, example: VaultRole.CONTRIBUTOR })
  role: VaultRole;
}
