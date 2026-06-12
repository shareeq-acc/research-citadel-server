import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { SendMessageDto, AddChatMemberDto, ChatMemberDto, ChatMessageDto } from './dto/chat.dto';
import { CollaborationGateway } from 'src/collaboration/collaboration.gateway';

// ── Prisma select shapes ──────────────────────────────────────────────────────

const messageSelect = {
  id: true,
  vaultId: true,
  senderId: true,
  content: true,
  replyToId: true,
  replyToText: true,
  replyToUser: true,
  readBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  sender: { select: { id: true, name: true, email: true, avatar: true } },
} as const;

const memberSelect = {
  id: true,
  vaultId: true,
  addedBy: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, avatar: true } },
} as const;

@Injectable()
export class ChatService {
  private readonly logger = new AppLoggerService(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CollaborationGateway,
  ) {}

  // ── Guards ──────────────────────────────────────────────────────────────────

  private async assertVaultMember(userId: string, vaultId: string) {
    const member = await this.prisma.vaultMember.findUnique({
      where: { vaultId_userId: { vaultId, userId } },
    });
    if (!member) throw throwError('Vault not found or access denied', HttpStatus.NOT_FOUND);
    return member;
  }

  private async assertVaultOwner(userId: string, vaultId: string) {
    const vault = await this.prisma.vault.findFirst({
      where: { id: vaultId, deletedAt: null },
    });
    if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);
    if (vault.ownerId !== userId)
      throw throwError('Only the vault owner can manage chat members', HttpStatus.FORBIDDEN);
    return vault;
  }

  private async assertChatMember(userId: string, vaultId: string) {
    // Vault owner always has access regardless of explicit chat membership
    const vault = await this.prisma.vault.findFirst({
      where: { id: vaultId, deletedAt: null },
    });
    if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);
    if (vault.ownerId === userId) return;

    const chatMember = await this.prisma.vaultChatMember.findUnique({
      where: { vaultId_userId: { vaultId, userId } },
    });
    if (!chatMember)
      throw throwError('You are not a member of this chat channel', HttpStatus.FORBIDDEN);
  }

  // ── Chat Members ────────────────────────────────────────────────────────────

  async getChatMembers(user: User, vaultId: string): Promise<ApiResponse<ChatMemberDto[]>> {
    try {
      await this.assertVaultMember(user.id, vaultId);

      const members = await this.prisma.vaultChatMember.findMany({
        where: { vaultId },
        select: memberSelect,
        orderBy: { createdAt: 'asc' },
      });

      // Always include owner in the list even if not explicitly added
      const vault = await this.prisma.vault.findFirst({
        where: { id: vaultId },
        select: { ownerId: true, owner: { select: { id: true, name: true, email: true, avatar: true } } },
      });

      const ownerAlreadyInList = members.some((m) => m.user.id === vault!.ownerId);
      const result: ChatMemberDto[] = members.map((m) => ({ ...m }));

      if (!ownerAlreadyInList && vault?.owner) {
        result.unshift({
          id: 'owner',
          vaultId,
          addedBy: vault.ownerId,
          createdAt: new Date(0),
          user: vault.owner,
        });
      }

      return { message: 'Chat members retrieved', success: true, data: result };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('getChatMembers failed', (err as Error)?.stack, ChatService.name);
      throw throwError((err as Error)?.message || 'Failed to get chat members', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addChatMember(user: User, vaultId: string, dto: AddChatMemberDto): Promise<ApiResponse<ChatMemberDto>> {
    try {
      await this.assertVaultOwner(user.id, vaultId);

      // Target must be a vault member
      const vaultMember = await this.prisma.vaultMember.findUnique({
        where: { vaultId_userId: { vaultId, userId: dto.userId } },
      });
      if (!vaultMember)
        throw throwError('User is not a member of this vault', HttpStatus.BAD_REQUEST);

      const existing = await this.prisma.vaultChatMember.findUnique({
        where: { vaultId_userId: { vaultId, userId: dto.userId } },
      });
      if (existing) throw throwError('User is already in the chat', HttpStatus.CONFLICT);

      const member = await this.prisma.vaultChatMember.create({
        data: { vaultId, userId: dto.userId, addedBy: user.id },
        select: memberSelect,
      });

      this.gateway.emitChatMemberAdded(vaultId, member);
      return { message: 'Member added to chat', success: true, data: member };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('addChatMember failed', (err as Error)?.stack, ChatService.name);
      throw throwError((err as Error)?.message || 'Failed to add chat member', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async removeChatMember(user: User, vaultId: string, targetUserId: string): Promise<ApiResponse<{ removed: boolean }>> {
    try {
      const vault = await this.assertVaultOwner(user.id, vaultId);

      if (targetUserId === vault.ownerId)
        throw throwError('Cannot remove the vault owner from the chat', HttpStatus.BAD_REQUEST);

      const member = await this.prisma.vaultChatMember.findUnique({
        where: { vaultId_userId: { vaultId, userId: targetUserId } },
      });
      if (!member) throw throwError('Member not found in chat', HttpStatus.NOT_FOUND);

      await this.prisma.vaultChatMember.delete({
        where: { vaultId_userId: { vaultId, userId: targetUserId } },
      });

      this.gateway.emitChatMemberRemoved(vaultId, targetUserId);
      return { message: 'Member removed from chat', success: true, data: { removed: true } };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('removeChatMember failed', (err as Error)?.stack, ChatService.name);
      throw throwError((err as Error)?.message || 'Failed to remove chat member', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── Messages ────────────────────────────────────────────────────────────────

  async getMessages(
    user: User,
    vaultId: string,
    options: { limit?: number; before?: string } = {},
  ): Promise<ApiResponse<ChatMessageDto[]>> {
    try {
      await this.assertChatMember(user.id, vaultId);

      const limit = Math.min(options.limit ?? 50, 100);
      const where: any = { vaultId, deletedAt: null };
      if (options.before) where.createdAt = { lt: new Date(options.before) };

      const messages = await this.prisma.vaultChatMessage.findMany({
        where,
        select: messageSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Mark as read by this user (fire-and-forget)
      const unread = messages.filter((m) => !m.readBy.includes(user.id)).map((m) => m.id);
      if (unread.length > 0) {
        this.prisma.vaultChatMessage
          .updateMany({
            where: { id: { in: unread } },
            data: { readBy: { push: user.id } },
          })
          .catch(() => {});
      }

      const data = messages.reverse().map((m) => ({
        ...m,
        deletedAt: undefined,
      })) as unknown as ChatMessageDto[];

      return { message: 'Messages retrieved', success: true, data };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('getMessages failed', (err as Error)?.stack, ChatService.name);
      throw throwError((err as Error)?.message || 'Failed to get messages', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async sendMessage(user: User, vaultId: string, dto: SendMessageDto): Promise<ApiResponse<ChatMessageDto>> {
    try {
      await this.assertChatMember(user.id, vaultId);

      let replyToText: string | null = null;
      let replyToUser: string | null = null;

      if (dto.replyToId) {
        const parent = await this.prisma.vaultChatMessage.findFirst({
          where: { id: dto.replyToId, vaultId, deletedAt: null },
          select: { content: true, sender: { select: { name: true } } },
        });
        if (parent) {
          replyToText = parent.content.slice(0, 200);
          replyToUser = parent.sender.name;
        }
      }

      const message = await this.prisma.vaultChatMessage.create({
        data: {
          vaultId,
          senderId: user.id,
          content: dto.content,
          replyToId: dto.replyToId ?? null,
          replyToText,
          replyToUser,
          readBy: [user.id],
        },
        select: messageSelect,
      });

      this.gateway.emitChatMessage(vaultId, message);
      return { message: 'Message sent', success: true, data: message as unknown as ChatMessageDto };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('sendMessage failed', (err as Error)?.stack, ChatService.name);
      throw throwError((err as Error)?.message || 'Failed to send message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteMessage(user: User, vaultId: string, messageId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      await this.assertChatMember(user.id, vaultId);

      const msg = await this.prisma.vaultChatMessage.findFirst({
        where: { id: messageId, vaultId, deletedAt: null },
      });
      if (!msg) throw throwError('Message not found', HttpStatus.NOT_FOUND);

      // Only sender or vault owner can delete
      const vault = await this.prisma.vault.findFirst({ where: { id: vaultId } });
      if (msg.senderId !== user.id && vault?.ownerId !== user.id)
        throw throwError('Not authorised to delete this message', HttpStatus.FORBIDDEN);

      await this.prisma.vaultChatMessage.update({
        where: { id: messageId },
        data: { deletedAt: new Date(), content: '[Message deleted]' },
      });

      this.gateway.emitChatMessageDeleted(vaultId, messageId);
      return { message: 'Message deleted', success: true, data: { deleted: true } };
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      this.logger.error('deleteMessage failed', (err as Error)?.stack, ChatService.name);
      throw throwError((err as Error)?.message || 'Failed to delete message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
