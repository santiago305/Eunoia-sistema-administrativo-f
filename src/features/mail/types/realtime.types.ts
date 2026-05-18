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

