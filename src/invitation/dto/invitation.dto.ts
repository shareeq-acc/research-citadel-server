import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { VaultRole } from '@prisma/client';

export class SendInvitationDto {
  @IsUUID('4')
  @ApiProperty({ description: 'ID of the user to invite', format: 'uuid' })
  invitedUserId: string;

  @IsEnum(VaultRole)
  @ApiProperty({ enum: VaultRole, example: VaultRole.CONTRIBUTOR })
  role: VaultRole;
}

export class RespondInvitationDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Invitation token from the email link' })
  token: string;

  @IsEnum(['ACCEPTED', 'REJECTED'])
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED'], description: 'Accept or reject the invitation' })
  action: 'ACCEPTED' | 'REJECTED';
}
