export type MailFolder = "inbox" | "starred" | "sent" | "scheduled" | "drafts" | "trash" | "archived" | "snoozed" | "all" | "files";

export type MailCategory =
  | "compras"
  | "produccion"
  | "almacen"
  | "catalogo"
  | "suministros"
  | "seguridad"
  | "roles"
  | "sistema"
  | "personal";

export interface Attachment {
  id: string;
  name: string;
  size: string;
  sizeBytes?: number;
  mimeType?: string;
  attachmentKind?: "file" | "image";
  url?: string;
}

export interface Mail {
  id: string;
  messageId?: string;
  recipientId?: string;
  threadId?: string | null;
  kind?: "SYSTEM_NOTIFICATION" | "USER_MESSAGE" | "SYSTEM_MESSAGE";
  senderType?: "USER" | "SYSTEM";
  originModule?: string;
  moduleLabel?: string;
  latestMessageId?: string;
  threadMessageCount?: number;
  threadLatestIndex?: number;
  threadLabel?: string | null;
  threadUnreadCount?: number;
  from: { name: string; email: string; avatar?: string };
  to: { name: string; email: string }[];
  subject: string;
  body: string;
  preview: string;
  date: string; // ISO
  read: boolean;
  starred: boolean;
  folder: MailFolder;
  category: MailCategory;
  attachments?: Attachment[];
  replies?: Mail[];
}
