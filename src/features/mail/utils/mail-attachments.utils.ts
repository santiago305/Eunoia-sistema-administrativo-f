import { API_NOTIFICATION_MESSAGES_GROUP } from "@/shared/services/APIs";
import { env } from "@/env";
import createDOMPurify from "dompurify";
import type { Attachment } from "../types/mail-ui.types";

export const MAX_MAIL_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export type MailAttachmentKind = "file" | "image";

export type BackendMailAttachment = {
  id: string;
  originalName?: string | null;
  name?: string | null;
  mimeType?: string | null;
  sizeBytes?: string | number | null;
  size?: string | number | null;
  attachmentKind?: MailAttachmentKind | string | null;
};

export const formatMailAttachmentSize = (sizeBytes: string | number | null | undefined) => {
  const bytes = Number(sizeBytes ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const buildMailAttachmentDownloadUrl = (id: string, baseUrl = env.apiBaseUrl ?? "") => {
  const path = API_NOTIFICATION_MESSAGES_GROUP.downloadAttachment(encodeURIComponent(id));
  const normalizedBase = String(baseUrl ?? "").replace(/\/$/, "");
  return `${normalizedBase}${path}`;
};

export const isInlineImageAttachment = (attachment: Pick<BackendMailAttachment, "attachmentKind" | "mimeType">) =>
  String(attachment.mimeType ?? "").toLowerCase().startsWith("image/");

export const removeBrokenMailBodyImages = (html: string) =>
  String(html ?? "").replace(/<img\b(?![^>]*\bsrc=)[^>]*\/?>/gi, "");

const MAIL_ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
];

const MAIL_ALLOWED_ATTR = [
  "align",
  "alt",
  "class",
  "colspan",
  "height",
  "href",
  "rel",
  "rowspan",
  "src",
  "target",
  "title",
  "width",
];

const MAIL_FORBIDDEN_TAGS = [
  "applet",
  "base",
  "button",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "meta",
  "object",
  "script",
  "select",
  "style",
  "textarea",
];

export const sanitizeMailHtml = (html: string) => {
  const input = String(html ?? "");
  if (!input.trim()) return "";
  if (typeof window === "undefined") {
    return removeBrokenMailBodyImages(input);
  }

  const domPurify = createDOMPurify(window);
  const sanitized = domPurify.sanitize(input, {
    ALLOWED_TAGS: MAIL_ALLOWED_TAGS,
    ALLOWED_ATTR: MAIL_ALLOWED_ATTR,
    FORBID_TAGS: MAIL_FORBIDDEN_TAGS,
    FORBID_ATTR: ["style"],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["rel"],
  });

  return removeBrokenMailBodyImages(String(sanitized ?? ""));
};

export const mapMailAttachment = (attachment: BackendMailAttachment, baseUrl = env.apiBaseUrl ?? ""): Attachment => {
  const sizeBytes = Number(attachment.sizeBytes ?? attachment.size ?? 0);
  const attachmentKind = attachment.attachmentKind === "image" ? "image" : "file";

  return {
    id: attachment.id,
    name: String(attachment.originalName ?? attachment.name ?? "archivo"),
    mimeType: attachment.mimeType ?? undefined,
    size: formatMailAttachmentSize(sizeBytes),
    sizeBytes,
    attachmentKind,
    url: buildMailAttachmentDownloadUrl(attachment.id, baseUrl),
  };
};
