import type { InboxItem, MailLabelItem, SentMessageItem } from "./message.types";

export type RealtimeRecipientState = InboxItem["recipient"] & {
  isArchived?: boolean;
  isInInbox?: boolean;
  snoozedUntil?: string | null;
};

export type MessageCreatedRealtimePayload = {
  recipientId?: string;
  messageRecipientId?: string;
  hasUnreadMail?: boolean;
  countsDelta?: Partial<{
    inbox: number;
    starred: number;
    sent: number;
    drafts: number;
    trash: number;
    archived: number;
    snoozed: number;
  }>;
  recipient?: RealtimeRecipientState;
  message?: (SentMessageItem & { preview?: string }) | null;
  sender?: InboxItem["sender"];
  labels?: MailLabelItem[];
};

export type MailActionUpdatedPayload = {
  actionId: string;
  threadId: string;
  messageId?: string | null;
  actionType: string;
  actionKey: string;
  targetEntityType: string;
  targetEntityId: string;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  completedByUserId?: string | null;
  completedByName?: string | null;
  completedAt?: string | null;
  version: number;
  metadata?: Record<string, unknown> | null;
  canExecute: boolean;
};

