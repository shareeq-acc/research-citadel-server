import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import {
  AiOperationCompletePayload,
  ChatMentionPayload,
  EmailVerifiedPayload,
  InvitationRespondedPayload,
  InvitationSentPayload,
  NotificationEvents,
  VaultMemberAddedPayload,
  VaultMemberRemovedPayload,
} from './events/notification.events';
import { NotificationEventBus } from './notification-event.bus';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationListener implements OnModuleInit {
  constructor(
    private readonly bus: NotificationEventBus,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit(): void {
    this.bus.on(NotificationEvents.VAULT_MEMBER_ADDED, (payload: VaultMemberAddedPayload) => {
      void this.handleVaultMemberAdded(payload);
    });

    this.bus.on(NotificationEvents.VAULT_MEMBER_REMOVED, (payload: VaultMemberRemovedPayload) => {
      void this.handleVaultMemberRemoved(payload);
    });

    this.bus.on(NotificationEvents.INVITATION_SENT, (payload: InvitationSentPayload) => {
      void this.handleInvitationSent(payload);
    });

    this.bus.on(NotificationEvents.INVITATION_RESPONDED, (payload: InvitationRespondedPayload) => {
      void this.handleInvitationResponded(payload);
    });

    this.bus.on(NotificationEvents.EMAIL_VERIFIED, (payload: EmailVerifiedPayload) => {
      void this.handleEmailVerified(payload);
    });

    this.bus.on(NotificationEvents.AI_OPERATION_COMPLETE, (payload: AiOperationCompletePayload) => {
      void this.handleAiOperationComplete(payload);
    });

    this.bus.on(NotificationEvents.CHAT_MENTION, (payload: ChatMentionPayload) => {
      void this.handleChatMention(payload);
    });
  }

  private async handleVaultMemberAdded(payload: VaultMemberAddedPayload): Promise<void> {
    await this.notificationService.createAndPush({
      userId: payload.userId,
      type: NotificationType.VAULT_ACTIVITY,
      title: 'Added to Vault',
      description: `${payload.addedByName} added you to "${payload.vaultName}".`,
      alertCategory: 'securityAlerts',
      metadata: {
        vaultId: payload.vaultId,
        linkPath: `/vault/${payload.vaultId}`,
      },
    });
  }

  private async handleVaultMemberRemoved(payload: VaultMemberRemovedPayload): Promise<void> {
    await this.notificationService.createAndPush({
      userId: payload.userId,
      type: NotificationType.VAULT_ACTIVITY,
      title: 'Removed from Vault',
      description: `${payload.removedByName} removed you from "${payload.vaultName}".`,
      alertCategory: 'securityAlerts',
      metadata: { vaultId: payload.vaultId },
    });
  }

  private async handleInvitationSent(payload: InvitationSentPayload): Promise<void> {
    await this.notificationService.createAndPush({
      userId: payload.invitedUserId,
      type: NotificationType.INVITATION,
      title: 'Co-Author Invitation',
      description: `${payload.senderName} invited you to collaborate on "${payload.vaultName}" as ${payload.role.toLowerCase()}.`,
      alertCategory: 'securityAlerts',
      metadata: {
        invitationId: payload.invitationId,
        vaultId: payload.vaultId,
        linkPath: '/invitations',
      },
    });
  }

  private async handleInvitationResponded(payload: InvitationRespondedPayload): Promise<void> {
    const title = payload.accepted ? 'Invitation Accepted' : 'Invitation Declined';
    const description = payload.accepted
      ? `${payload.respondentName} accepted your invitation to "${payload.vaultName}".`
      : `${payload.respondentName} declined your invitation to "${payload.vaultName}".`;

    await this.notificationService.createAndPush({
      userId: payload.senderId,
      type: NotificationType.INVITATION,
      title,
      description,
      alertCategory: 'securityAlerts',
      metadata: {
        vaultId: payload.vaultId,
        linkPath: payload.accepted ? `/vault/${payload.vaultId}` : undefined,
      },
    });
  }

  private async handleEmailVerified(payload: EmailVerifiedPayload): Promise<void> {
    await this.notificationService.createAndPush({
      userId: payload.userId,
      type: NotificationType.SECURITY,
      title: 'Email Verified',
      description: 'Your email address has been confirmed. Collaborative editing is now enabled.',
      alertCategory: 'securityAlerts',
      metadata: { linkPath: '/dashboard' },
    });
  }

  private async handleAiOperationComplete(payload: AiOperationCompletePayload): Promise<void> {
    const titles: Record<AiOperationCompletePayload['operation'], string> = {
      SUMMARIZATION: 'Summary Ready',
      INSIGHTS: 'Insights Extracted',
      EXTRACT_INDEX: 'PDF Extraction Complete',
    };

    const descriptions: Record<AiOperationCompletePayload['operation'], string> = {
      SUMMARIZATION: `AI summary generated for "${payload.sourceTitle}".`,
      INSIGHTS: `Key insights extracted from "${payload.sourceTitle}".`,
      EXTRACT_INDEX: `AI grounding index generated for "${payload.sourceTitle}".`,
    };

    await this.notificationService.createAndPush({
      userId: payload.userId,
      type: NotificationType.AI_COMPLETE,
      title: titles[payload.operation],
      description: descriptions[payload.operation],
      alertCategory: 'systemUpdates',
      metadata: {
        vaultId: payload.vaultId,
        sourceId: payload.sourceId,
        operation: payload.operation,
        linkPath: `/source/${payload.vaultId}/${payload.sourceId}`,
      },
    });
  }

  private async handleChatMention(payload: ChatMentionPayload): Promise<void> {
    await this.notificationService.createAndPush({
      userId: payload.mentionedUserId,
      type: NotificationType.VAULT_ACTIVITY,
      title: 'You were mentioned',
      description: `${payload.senderName} mentioned you in "${payload.vaultName}": "${payload.messagePreview}"`,
      alertCategory: 'chatMentions',
      metadata: {
        vaultId: payload.vaultId,
        linkPath: `/dashboard?vault=${payload.vaultId}&tab=colloquium`,
      },
    });
  }
}
