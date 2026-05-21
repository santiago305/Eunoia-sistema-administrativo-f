export type MessageFolder = "inbox" | "sent" | "trash" | "starred" | "archived" | "snoozed" | "drafts" | "all";

export interface NotificationModuleItem {
  key: string;
  label: string;
  icon: string;
}

export interface MailLabelItem {
  id: string;
  ownerUserId: string | null;
  key: string;
  name: string;
  type: "SYSTEM" | "MODULE" | "CUSTOM";
  color: string | null;
  icon: string | null;
  isVisible: boolean;
  sortOrder: number;
}

export interface MessageListQuery {
  view?: MessageFolder;
  originModule?: string;
  read?: boolean;
  hasAttachments?: boolean;
  labelId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface MessageListResponse<T = unknown> {
  page: number;
  limit: number;
  total: number;
  items: T[];
}

export interface MailMessageActionItem {
  id: string;
  threadId: string;
  messageId?: string | null;
  actionKey: string;
  actionType: string;
  targetEntityType: string;
  targetEntityId: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  completedByUserId?: string | null;
  completedByName?: string | null;
  completedAt?: string | null;
  version: number;
  metadata?: Record<string, unknown> | null;
  canExecute: boolean;
}

export interface SentMessageItem {
  id: string;
  threadId: string | null;
  parentMessageId: string | null;
  kind: "SYSTEM_NOTIFICATION" | "USER_MESSAGE" | "SYSTEM_MESSAGE";
  originModule: string;
  senderType: "USER" | "SYSTEM";
  senderUserId: string | null;
  createdByUserId: string | null;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  bodyJson?: Record<string, unknown> | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  latestMessageId?: string;
  threadMessageCount?: number;
  threadLatestIndex?: number;
  threadLabel?: string | null;
  actions?: MailMessageActionItem[];
  status: "DRAFT" | "SENT" | "FAILED" | "SCHEDULED";
  isDraft: boolean;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboxItem {
  recipient: {
    id: string;
    messageId: string;
    recipientUserId: string;
    recipientEmail: string;
    recipientType: "TO" | "CC" | "BCC";
    readAt: string | null;
    starredAt: string | null;
    deletedAt: string | null;
    deliveredAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  labels?: Array<{ id: string; name?: string; type?: "SYSTEM" | "MODULE" | "CUSTOM" }>;
  sender?: {
    id: string;
    name: string;
    email: string;
  } | null;
  message: SentMessageItem | null;
}

export interface DraftMessageItem extends SentMessageItem {}
