import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Message text', maxLength: 4000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;

  @ApiProperty({ description: 'ID of the message being replied to', required: false })
  @IsOptional()
  @IsUUID('4')
  replyToId?: string;
}

export class AddChatMemberDto {
  @ApiProperty({ description: 'Vault member user ID to add to the chat', format: 'uuid' })
  @IsUUID('4')
  userId: string;
}

// ── Response shapes ───────────────────────────────────────────────────────────

export class ChatMemberUserDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true }) avatar: string | null;
}

export class ChatMemberDto {
  @ApiProperty() id: string;
  @ApiProperty() vaultId: string;
  @ApiProperty() addedBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: ChatMemberUserDto }) user: ChatMemberUserDto;
}

export class ChatMessageDto {
  @ApiProperty() id: string;
  @ApiProperty() vaultId: string;
  @ApiProperty() senderId: string;
  @ApiProperty() content: string;
  @ApiProperty({ nullable: true }) replyToId: string | null;
  @ApiProperty({ nullable: true }) replyToText: string | null;
  @ApiProperty({ nullable: true }) replyToUser: string | null;
  @ApiProperty({ type: [String] }) readBy: string[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: ChatMemberUserDto }) sender: ChatMemberUserDto;
}
