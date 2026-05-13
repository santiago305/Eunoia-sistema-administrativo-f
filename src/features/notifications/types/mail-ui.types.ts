export type MailFolder = "inbox" | "starred" | "sent" | "drafts" | "trash" | "archived" | "snoozed";

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
  url?: string;
}

export interface Mail {
  id: string;
  messageId?: string;
  recipientId?: string;
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
