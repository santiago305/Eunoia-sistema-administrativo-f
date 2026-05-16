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
  folder?: MessageFolder;
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
  sender?: {
    id: string;
    name: string;
    email: string;
  } | null;
  message: SentMessageItem | null;
}

export interface DraftMessageItem extends SentMessageItem {}
