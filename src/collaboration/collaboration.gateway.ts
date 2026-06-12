import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { AuthenticatedSocket } from './guards/ws-jwt.guard';

export const COLLABORATION_NAMESPACE = '/collaboration';

/** Event names emitted to clients for real-time updates */
export const CollaborationEvents = {
  SOURCE_CREATED: 'source:created',
  SOURCE_UPDATED: 'source:updated',
  SOURCE_DELETED: 'source:deleted',
  ANNOTATION_CREATED: 'annotation:created',
  ANNOTATION_UPDATED: 'annotation:updated',
  ANNOTATION_DELETED: 'annotation:deleted',
  ANNOTATION_EDITING: 'annotation:editing',
  ANNOTATION_DRAFT: 'annotation:draft',
  NOTIFICATION_VAULT_ADDED: 'notification:vault_added',
  NOTIFICATION_NEW: 'notification:new',
  // Chat
  CHAT_MESSAGE: 'chat:message',
  CHAT_MESSAGE_DELETED: 'chat:message_deleted',
  CHAT_TYPING: 'chat:typing',
  CHAT_MEMBER_ADDED: 'chat:member_added',
  CHAT_MEMBER_REMOVED: 'chat:member_removed',
} as const;

export interface EditorInfo {
  userId: string;
  name: string;
}

/** Room prefix for vault-scoped rooms: join room `vault:${vaultId}` */
export function vaultRoom(vaultId: string): string {
  return `vault:${vaultId}`;
}

/** Room for user-scoped push notifications: join room `user:${userId}` */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** In-memory presence: annotationId -> editors (userId -> name). Cleared on server restart. */
const editorsByAnnotation = new Map<string, Map<string, string>>();
/** Socket id -> { vaultId, annotationId, userId } so we can clean up on disconnect */
const socketEditing = new Map<string, { vaultId: string; annotationId: string; userId: string }>();

/** Viewers: annotationId -> (userId -> name) */
const viewersByAnnotation = new Map<string, Map<string, string>>();
/** Socket id -> viewing info for disconnect cleanup */
const socketViewing = new Map<string, { vaultId: string; annotationId: string; userId: string }>();

@WebSocketGateway({
  namespace: COLLABORATION_NAMESPACE,
  cors: { origin: true },
})
export class CollaborationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  afterInit() {
    this.logger.log('Collaboration WebSocket gateway initialized', CollaborationGateway.name);
  }

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(
      `Client connecting: ${client.id}`,
      CollaborationGateway.name,
    );
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const editing = socketEditing.get(client.id);
    if (editing) {
      this.removeEditor(editing.vaultId, editing.annotationId, editing.userId, client.id);
    }
    socketEditing.delete(client.id);

    const viewing = socketViewing.get(client.id);
    if (viewing) {
      this.removeViewer(viewing.vaultId, viewing.annotationId, viewing.userId, client.id);
    }
    socketViewing.delete(client.id);

    this.logger.log(`Client disconnected: ${client.id}`, CollaborationGateway.name);
  }

  private broadcastEditors(vaultId: string, annotationId: string): void {
    const editorsMap = editorsByAnnotation.get(annotationId);
    const editors = editorsMap
      ? Array.from(editorsMap.entries()).map(([userId, name]) => ({ userId, name, status: 'editing' }))
      : [];

    const viewersMap = viewersByAnnotation.get(annotationId);
    const viewers = viewersMap
      ? Array.from(viewersMap.entries()).map(([userId, name]) => ({ userId, name, status: 'viewing' }))
      : [];

    // Broadcast unified presence list
    this.emitToVault(vaultId, CollaborationEvents.ANNOTATION_EDITING, {
      annotationId,
      editors,         // kept for backward compat
      presence: [...editors, ...viewers],
    });
  }

  private removeEditor(vaultId: string, annotationId: string, userId: string, socketId: string): void {
    socketEditing.delete(socketId);
    const map = editorsByAnnotation.get(annotationId);
    if (map) {
      map.delete(userId);
      if (map.size === 0) editorsByAnnotation.delete(annotationId);
      this.broadcastEditors(vaultId, annotationId);
    }
  }

  private removeViewer(vaultId: string, annotationId: string, userId: string, socketId: string): void {
    socketViewing.delete(socketId);
    const map = viewersByAnnotation.get(annotationId);
    if (map) {
      map.delete(userId);
      if (map.size === 0) viewersByAnnotation.delete(annotationId);
      this.broadcastEditors(vaultId, annotationId);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinUser')
  async handleJoinUser(client: AuthenticatedSocket): Promise<{ success: boolean; message?: string }> {
    const user = client.data.user;
    if (!user) return { success: false, message: 'Unauthorized' };
    const room = userRoom(user.id);
    await client.join(room);
    this.logger.log(`User ${user.id} joined user room ${room}`, CollaborationGateway.name);
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinVault')
  async handleJoinVault(
    client: AuthenticatedSocket,
    payload: { vaultId: string },
  ): Promise<{ success: boolean; message?: string }> {
    const vaultId = payload?.vaultId;
    if (!vaultId || typeof vaultId !== 'string') {
      return { success: false, message: 'vaultId is required' };
    }

    const user = client.data.user;
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    const member = await this.prisma.vaultMember.findUnique({
      where: { vaultId_userId: { vaultId, userId: user.id } },
    });
    if (!member) {
      return { success: false, message: 'Vault not found or access denied' };
    }

    const room = vaultRoom(vaultId);
    await client.join(room);
    this.logger.log(
      `User ${user.id} joined vault room ${room}`,
      CollaborationGateway.name,
    );
    return { success: true };
  }

  @SubscribeMessage('leaveVault')
  handleLeaveVault(
    client: AuthenticatedSocket,
    payload: { vaultId: string },
  ): { success: boolean } {
    const vaultId = payload?.vaultId;
    if (vaultId && typeof vaultId === 'string') {
      const editing = socketEditing.get(client.id);
      if (editing && editing.vaultId === vaultId) {
        this.removeEditor(editing.vaultId, editing.annotationId, editing.userId, client.id);
      }
      const viewing = socketViewing.get(client.id);
      if (viewing && viewing.vaultId === vaultId) {
        this.removeViewer(viewing.vaultId, viewing.annotationId, viewing.userId, client.id);
      }
      client.leave(vaultRoom(vaultId));
    }
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('startViewing')
  async handleStartViewing(
    client: AuthenticatedSocket,
    payload: { vaultId: string; annotationId: string },
  ): Promise<{ success: boolean; message?: string }> {
    const { vaultId, annotationId } = payload || {};
    if (!vaultId || !annotationId) return { success: false, message: 'vaultId and annotationId required' };
    const user = client.data.user;
    if (!user) return { success: false, message: 'Unauthorized' };

    const member = await this.prisma.vaultMember.findUnique({
      where: { vaultId_userId: { vaultId, userId: user.id } },
    });
    if (!member) return { success: false, message: 'Vault not found or access denied' };

    const existing = socketViewing.get(client.id);
    if (existing) this.removeViewer(existing.vaultId, existing.annotationId, existing.userId, client.id);

    let map = viewersByAnnotation.get(annotationId);
    if (!map) { map = new Map(); viewersByAnnotation.set(annotationId, map); }
    map.set(user.id, user.name);
    socketViewing.set(client.id, { vaultId, annotationId, userId: user.id });
    this.broadcastEditors(vaultId, annotationId);
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('stopViewing')
  handleStopViewing(
    client: AuthenticatedSocket,
    payload: { vaultId: string; annotationId: string },
  ): { success: boolean } {
    const { vaultId, annotationId } = payload || {};
    const user = client.data.user;
    if (vaultId && annotationId && user) this.removeViewer(vaultId, annotationId, user.id, client.id);
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('startEditing')
  async handleStartEditing(
    client: AuthenticatedSocket,
    payload: { vaultId: string; annotationId: string },
  ): Promise<{ success: boolean; message?: string }> {
    const { vaultId, annotationId } = payload || {};
    if (!vaultId || !annotationId) {
      return { success: false, message: 'vaultId and annotationId required' };
    }
    const user = client.data.user;
    if (!user) return { success: false, message: 'Unauthorized' };

    const member = await this.prisma.vaultMember.findUnique({
      where: { vaultId_userId: { vaultId, userId: user.id } },
    });
    if (!member) return { success: false, message: 'Vault not found or access denied' };

    const existing = socketEditing.get(client.id);
    if (existing) {
      this.removeEditor(existing.vaultId, existing.annotationId, existing.userId, client.id);
    }

    let map = editorsByAnnotation.get(annotationId);
    if (!map) {
      map = new Map();
      editorsByAnnotation.set(annotationId, map);
    }
    map.set(user.id, user.name);
    socketEditing.set(client.id, { vaultId, annotationId, userId: user.id });
    this.broadcastEditors(vaultId, annotationId);
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('stopEditing')
  handleStopEditing(
    client: AuthenticatedSocket,
    payload: { vaultId: string; annotationId: string },
  ): { success: boolean } {
    const { vaultId, annotationId } = payload || {};
    const user = client.data.user;
    if (vaultId && annotationId && user) {
      this.removeEditor(vaultId, annotationId, user.id, client.id);
    }
    return { success: true };
  }

  /** Live draft: broadcast current editor content so other users see changes in real time */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('annotation:draft')
  async handleAnnotationDraft(
    client: AuthenticatedSocket,
    payload: {
      vaultId: string;
      annotationId: string;
      contentMarkdown?: string;
      pageReference?: number | null;
      sectionReference?: string | null;
    },
  ): Promise<{ success: boolean; message?: string }> {
    const { vaultId, annotationId, contentMarkdown, pageReference, sectionReference } = payload || {};
    if (!vaultId || !annotationId) {
      return { success: false, message: 'vaultId and annotationId required' };
    }
    const user = client.data.user;
    if (!user) return { success: false, message: 'Unauthorized' };

    const member = await this.prisma.vaultMember.findUnique({
      where: { vaultId_userId: { vaultId, userId: user.id } },
    });
    if (!member) return { success: false, message: 'Vault not found or access denied' };

    this.emitToVault(vaultId, CollaborationEvents.ANNOTATION_DRAFT, {
      annotationId,
      contentMarkdown: contentMarkdown ?? '',
      pageReference: pageReference ?? null,
      sectionReference: sectionReference ?? null,
      userId: user.id,
      userName: user.name,
    });
    return { success: true };
  }

  /** Emit to all clients in a vault room (call from SourceService / AnnotationService) */
  emitToVault<T>(vaultId: string, event: string, data: T): void {
    if (!this.server) return;
    const room = vaultRoom(vaultId);
    this.server.to(room).emit(event, data);
  }

  emitSourceCreated(vaultId: string, source: object): void {
    this.emitToVault(vaultId, CollaborationEvents.SOURCE_CREATED, { source });
  }

  emitSourceUpdated(vaultId: string, source: object): void {
    this.emitToVault(vaultId, CollaborationEvents.SOURCE_UPDATED, { source });
  }

  emitSourceDeleted(vaultId: string, sourceId: string): void {
    this.emitToVault(vaultId, CollaborationEvents.SOURCE_DELETED, { sourceId });
  }

  emitAnnotationCreated(
    vaultId: string,
    sourceId: string,
    annotation: object,
  ): void {
    this.emitToVault(vaultId, CollaborationEvents.ANNOTATION_CREATED, {
      sourceId,
      annotation,
    });
  }

  emitAnnotationUpdated(
    vaultId: string,
    sourceId: string,
    annotation: object,
  ): void {
    this.emitToVault(vaultId, CollaborationEvents.ANNOTATION_UPDATED, {
      sourceId,
      annotation,
    });
  }

  emitAnnotationDeleted(
    vaultId: string,
    sourceId: string,
    annotationId: string,
  ): void {
    this.emitToVault(vaultId, CollaborationEvents.ANNOTATION_DELETED, {
      sourceId,
      annotationId,
    });
  }

  /** Emit to a specific user (e.g. when they are added to a vault). */
  emitVaultAddedToUser(
    userId: string,
    payload: { vaultId: string; vaultName: string; addedByName: string },
  ): void {
    if (!this.server) return;
    this.server.to(userRoom(userId)).emit(CollaborationEvents.NOTIFICATION_VAULT_ADDED, payload);
  }

  /** Push a persisted notification to a user's private room. */
  emitNotificationToUser(userId: string, notification: object): void {
    if (!this.server) return;
    this.server.to(userRoom(userId)).emit(CollaborationEvents.NOTIFICATION_NEW, notification);
  }

  // ── Chat helpers ────────────────────────────────────────────────────────────

  emitChatMessage(vaultId: string, message: object): void {
    this.emitToVault(vaultId, CollaborationEvents.CHAT_MESSAGE, message);
  }

  emitChatMessageDeleted(vaultId: string, messageId: string): void {
    this.emitToVault(vaultId, CollaborationEvents.CHAT_MESSAGE_DELETED, { messageId });
  }

  emitChatMemberAdded(vaultId: string, member: object): void {
    this.emitToVault(vaultId, CollaborationEvents.CHAT_MEMBER_ADDED, member);
  }

  emitChatMemberRemoved(vaultId: string, userId: string): void {
    this.emitToVault(vaultId, CollaborationEvents.CHAT_MEMBER_REMOVED, { userId });
  }

  /** Client sends typing status; server broadcasts to the rest of the vault room. */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:typing')
  async handleChatTyping(
    client: AuthenticatedSocket,
    payload: { vaultId: string; isTyping: boolean },
  ): Promise<{ success: boolean }> {
    const { vaultId, isTyping } = payload || {};
    const user = client.data.user;
    if (!vaultId || !user) return { success: false };

    // Broadcast to others in the room (not back to sender)
    client.to(vaultRoom(vaultId)).emit(CollaborationEvents.CHAT_TYPING, {
      userId: user.id,
      userName: user.name,
      isTyping,
    });
    return { success: true };
  }
}
