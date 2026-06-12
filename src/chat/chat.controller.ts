import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse as ApiDoc, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiResponse } from 'src/common/types';
import { ChatService } from './chat.service';
import { SendMessageDto, AddChatMemberDto, ChatMemberDto, ChatMessageDto } from './dto/chat.dto';

@Controller('vault/:vaultId/chat')
@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ── Members ──────────────────────────────────────────────────────────────

  @Get('members')
  @ApiOperation({ summary: 'List chat members', description: 'All vault members can view. Owner is always included.' })
  @ApiParam({ name: 'vaultId', type: String })
  async getChatMembers(
    @CurrentUser() user: User,
    @Param('vaultId', new ParseUUIDPipe({ version: '4' })) vaultId: string,
  ): Promise<ApiResponse<ChatMemberDto[]>> {
    return this.chatService.getChatMembers(user, vaultId);
  }

  @Post('members')
  @ApiOperation({ summary: 'Add a vault member to the chat', description: 'Owner only. Target must be a vault member.' })
  @ApiParam({ name: 'vaultId', type: String })
  async addChatMember(
    @CurrentUser() user: User,
    @Param('vaultId', new ParseUUIDPipe({ version: '4' })) vaultId: string,
    @Body() dto: AddChatMemberDto,
  ): Promise<ApiResponse<ChatMemberDto>> {
    return this.chatService.addChatMember(user, vaultId, dto);
  }

  @Delete('members/:userId')
  @ApiOperation({ summary: 'Remove a member from the chat', description: 'Owner only. Cannot remove owner.' })
  @ApiParam({ name: 'vaultId', type: String })
  @ApiParam({ name: 'userId', type: String })
  async removeChatMember(
    @CurrentUser() user: User,
    @Param('vaultId', new ParseUUIDPipe({ version: '4' })) vaultId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ): Promise<ApiResponse<{ removed: boolean }>> {
    return this.chatService.removeChatMember(user, vaultId, userId);
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  @Get('messages')
  @ApiOperation({ summary: 'Get chat messages', description: 'Chat members only. Supports cursor pagination via `before` ISO timestamp.' })
  @ApiParam({ name: 'vaultId', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max messages (default 50, max 100)' })
  @ApiQuery({ name: 'before', required: false, type: String, description: 'ISO timestamp for cursor pagination' })
  async getMessages(
    @CurrentUser() user: User,
    @Param('vaultId', new ParseUUIDPipe({ version: '4' })) vaultId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ): Promise<ApiResponse<ChatMessageDto[]>> {
    return this.chatService.getMessages(user, vaultId, {
      limit: limit ? Number(limit) : undefined,
      before,
    });
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a chat message', description: 'Chat members only. Supports replies via replyToId.' })
  @ApiParam({ name: 'vaultId', type: String })
  async sendMessage(
    @CurrentUser() user: User,
    @Param('vaultId', new ParseUUIDPipe({ version: '4' })) vaultId: string,
    @Body() dto: SendMessageDto,
  ): Promise<ApiResponse<ChatMessageDto>> {
    return this.chatService.sendMessage(user, vaultId, dto);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message', description: 'Sender or vault owner can delete.' })
  @ApiParam({ name: 'vaultId', type: String })
  @ApiParam({ name: 'messageId', type: String })
  async deleteMessage(
    @CurrentUser() user: User,
    @Param('vaultId', new ParseUUIDPipe({ version: '4' })) vaultId: string,
    @Param('messageId', new ParseUUIDPipe({ version: '4' })) messageId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.chatService.deleteMessage(user, vaultId, messageId);
  }
}
