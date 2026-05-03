export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';

export interface NotificationPayload {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  actionUrl: string | null;
  actionLabel: string | null;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationRecipientItem {
  recipientId: string;
  status: 'UNREAD' | 'SEEN' | 'READ' | 'ARCHIVED' | 'DISMISSED' | 'DELETED';
  seenAt: string | null;
  readAt: string | null;
  deliveredAt: string | null;
  archivedAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  notification: NotificationPayload;
}

export interface NotificationUnreadCount {
  unread: number;
  unseen: number;
}
