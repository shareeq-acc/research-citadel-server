/** Domain events emitted by services; handled by NotificationListener. */
export const NotificationEvents = {
  VAULT_MEMBER_ADDED: 'notification.vault_member_added',
  VAULT_MEMBER_REMOVED: 'notification.vault_member_removed',
  INVITATION_SENT: 'notification.invitation_sent',
  INVITATION_RESPONDED: 'notification.invitation_responded',
  EMAIL_VERIFIED: 'notification.email_verified',
  AI_OPERATION_COMPLETE: 'notification.ai_operation_complete',
  CHAT_MENTION: 'notification.chat_mention',
} as const;

export type NotificationEventName =
  (typeof NotificationEvents)[keyof typeof NotificationEvents];

export interface VaultMemberAddedPayload {
  userId: string;
  vaultId: string;
  vaultName: string;
  addedByName: string;
}

export interface VaultMemberRemovedPayload {
  userId: string;
  vaultId: string;
  vaultName: string;
  removedByName: string;
}

export interface InvitationSentPayload {
  invitedUserId: string;
  invitationId: string;
  vaultId: string;
  vaultName: string;
  senderName: string;
  role: string;
}

export interface InvitationRespondedPayload {
  senderId: string;
  vaultId: string;
  vaultName: string;
  respondentName: string;
  accepted: boolean;
}

export interface EmailVerifiedPayload {
  userId: string;
}

export interface AiOperationCompletePayload {
  userId: string;
  vaultId: string;
  sourceId: string;
  sourceTitle: string;
  operation: 'SUMMARIZATION' | 'INSIGHTS' | 'EXTRACT_INDEX';
}

export interface ChatMentionPayload {
  mentionedUserId: string;
  vaultId: string;
  vaultName: string;
  senderName: string;
  messagePreview: string;
}
