import { ApiProperty } from '@nestjs/swagger';
import { VaultRole } from '@prisma/client';

export class VaultMemberUserDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Jane Smith' })
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiProperty({ nullable: true, example: 'https://...' })
  avatar: string | null;
}

export class VaultMemberResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: VaultRole, example: VaultRole.CONTRIBUTOR })
  role: string;

  @ApiProperty({ type: VaultMemberUserDto })
  user: VaultMemberUserDto;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  joinedAt: string;
}
