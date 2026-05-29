import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Trash2,
  Mail as MailIcon,
  MailOpen,
  Reply,
  Forward,
  CalendarClock,
  SendHorizontal,
  Star,
  Printer,
  MoreVertical,
  Paperclip,
  Tag,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import type { Attachment, Mail } from "../types/mail-ui.types";
import { cn } from "@/shared/lib/utils";
import { LiaTrashRestoreAltSolid } from "react-icons/lia";
import type { MailLabelItem, MailMessageActionItem } from "../types/message.types";
import { ImagePreviewModal } from "@/shared/components/components/ImagePreviewModal";
import { isInlineImageAttachment, mapMailAttachment, sanitizeMailHtml, type BackendMailAttachment } from "../utils/mail-attachments.utils";
import { normalizeConversationSubject } from "../utils/mail-subject.utils";
import { downloadAttachmentBlobUrl } from "../services/messages.service";
import InlineReplyForwardBox from "./InlineReplyForwardBox";
import MailActionBlock from "./MailActionBlock";
import { resolveProfileAvatarUrl } from "@/features/profile/components/profile.utils";

interface Props {
  mail: Mail | null;
  detailData?: {
    message?: {
      id?: string;
      threadId?: string | null;
      kind?: "SYSTEM_NOTIFICATION" | "USER_MESSAGE" | "SYSTEM_MESSAGE";
      senderType?: "USER" | "SYSTEM";
      subject?: string;
      bodyHtml?: string;
      bodyText?: string;
      bodyJson?: Record<string, unknown> | null;
      sentAt?: string | null;
      createdAt?: string;
    } | null;
    sender?: { id?: string; name?: string; email?: string; avatarUrl?: string | null } | null;
    recipients?: Array<{ id?: string; recipientEmail?: string; recipientType?: string }>;
      attachments?: Array<Attachment | BackendMailAttachment>;
      thread?: Array<{
      id: string;
      subject: string;
      bodyHtml: string;
      bodyJson?: Record<string, unknown> | null;
      createdAt: string;
      sentAt?: string | null;
      kind?: "SYSTEM_NOTIFICATION" | "USER_MESSAGE" | "SYSTEM_MESSAGE";
      senderType?: "USER" | "SYSTEM";
      sender?: { id?: string; name?: string; email?: string; avatarUrl?: string | null } | null;
        recipients?: Array<{ id?: string; recipientEmail?: string; recipientType?: string }>;
        attachments?: Array<Attachment | BackendMailAttachment>;
        actions?: MailMessageActionItem[];
        threadLabel?: string | null;
      }>;
    permissions?: { canReply?: boolean; canForward?: boolean };
  } | null;
  currentUserEmail: string;
  currentUserName?: string;
  currentUserAvatarUrl?: string;
  onBack: () => void;
  onSetRead: (id: string, read: boolean) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onToggleStar: (id: string) => void;
  availableLabels?: MailLabelItem[];
  selectedLabelIds?: string[];
  onToggleLabel?: (messageId: string, labelId: string, selected: boolean) => void;
  onComposePrefill: (payload: {
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    body?: string;
    bodyJson?: Record<string, unknown> | null;
    attachmentIds?: string[];
    mode?: "new" | "reply" | "forward";
    parentMessageId?: string | null;
  }) => void;
  onInlineComposeSend: (payload: {
    mode: "reply" | "forward";
    parentMessageId: string;
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body: string;
    bodyJson?: Record<string, unknown> | null;
    attachmentIds?: string[];
  }) => Promise<void>;
  onCreateInlineDraft: (input: {
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body: string;
    bodyJson?: Record<string, unknown> | null;
    attachmentIds?: string[];
  }) => Promise<string>;
  onUploadAttachment: (input: { file: File; draftId: string; kind: "image" | "file" }) => Promise<{ id: string }>;
  onDeleteAttachment: (attachmentId: string) => Promise<void>;
  onExecuteAction: (actionId: string) => Promise<void>;
  onSendScheduledNow?: (id: string) => void;
  onRescheduleScheduled?: (id: string) => void;
  onCancelScheduled?: (id: string) => void;
  formatFullDate: (iso: string) => string;
  initialsOf: (name: string) => string;
  avatarColor: (seed: string) => string;
}

type ForwardedMessagePreview = {
  subject?: string;
  senderName?: string;
  senderEmail?: string;
  sentAt?: string | null;
  bodyPreview?: string;
};

type DetailThreadItem = NonNullable<NonNullable<Props["detailData"]>["thread"]>[number];
const EMPTY_THREAD_ITEMS: DetailThreadItem[] = [];

const getForwardedMessagePreview = (bodyJson?: Record<string, unknown> | null): ForwardedMessagePreview | null => {
  const raw = bodyJson?.forwardedMessage;
  if (!raw || typeof raw !== "object") return null;
  return raw as ForwardedMessagePreview;
};

const normalizeDetailAttachment = (attachment: Attachment | BackendMailAttachment): Attachment => {
  if ("url" in attachment && attachment.url) return attachment as Attachment;
  return mapMailAttachment(attachment as BackendMailAttachment);
};

export default function MailDetail(props: Props) {
  const mail = props.mail;
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});
  const [inlineMode, setInlineMode] = useState<"reply" | "forward" | null>(null);
  const [inlineTo, setInlineTo] = useState("");
  const [inlineCc, setInlineCc] = useState("");
  const [inlineBcc, setInlineBcc] = useState("");
  const [inlineBody, setInlineBody] = useState("");
  const [inlineBodyJson, setInlineBodyJson] = useState<Record<string, unknown> | null>(null);
  const [inlineAttachmentIds, setInlineAttachmentIds] = useState<string[]>([]);
  const [inlineDraftId, setInlineDraftId] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlineSending, setInlineSending] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const attachments = mail?.attachments ?? [];
  const threadItems = props.detailData?.thread ?? EMPTY_THREAD_ITEMS;
  const conversationItems = useMemo<DetailThreadItem[]>(() => {
    if (!mail) return [];
    if (threadItems.length > 0) return threadItems;

    return [
      {
        id: mail.messageId ?? mail.id,
        subject: mail.subject,
        bodyHtml: mail.body,
        bodyJson: null,
        createdAt: mail.date,
        sentAt: mail.date,
        kind: mail.kind,
        senderType: mail.senderType,
        sender: props.detailData?.sender ?? { name: mail.from.name, email: mail.from.email },
        recipients: props.detailData?.recipients,
        attachments: attachments,
      },
    ];
  }, [attachments, mail, props.detailData?.recipients, props.detailData?.sender, threadItems]);
  const conversationImageAttachments = useMemo(
    () =>
      conversationItems
        .flatMap((item) => item.attachments ?? [])
        .map(normalizeDetailAttachment)
        .filter((attachment) => isInlineImageAttachment(attachment)),
    [conversationItems],
  );
  const previewableImageAttachments = conversationImageAttachments.filter((attachment) => Boolean(imagePreviewUrls[attachment.id]));
  const previewImages = previewableImageAttachments.map((attachment) => imagePreviewUrls[attachment.id]);
  const previewNames = previewableImageAttachments.map((attachment) => attachment.name);

  useEffect(() => {
    let cancelled = false;
    const createdObjectUrls: string[] = [];

    setImagePreviewUrls({});

    conversationImageAttachments.forEach((attachment) => {
      void (async () => {
        try {
          const objectUrl = await downloadAttachmentBlobUrl(attachment.id);
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          createdObjectUrls.push(objectUrl);
          setImagePreviewUrls((prev) => ({ ...prev, [attachment.id]: objectUrl }));
        } catch {
          setImagePreviewUrls((prev) => ({ ...prev, [attachment.id]: "" }));
        }
      })();
    });

    return () => {
      cancelled = true;
      createdObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [conversationImageAttachments]);

  if (!mail) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Mensaje no encontrado</div>;
  }

  const recipientsFromDetail =
    props.detailData?.recipients?.filter((item) => Boolean(item?.recipientEmail?.trim())) ?? [];
  const toRecipients = recipientsFromDetail
    .filter((item) => (item.recipientType ?? "TO").toUpperCase() === "TO")
    .map((item) => item.recipientEmail!.trim());
  const ccRecipients = recipientsFromDetail
    .filter((item) => (item.recipientType ?? "").toUpperCase() === "CC")
    .map((item) => item.recipientEmail!.trim());
  const bccRecipients = recipientsFromDetail
    .filter((item) => (item.recipientType ?? "").toUpperCase() === "BCC")
    .map((item) => item.recipientEmail!.trim());
  const fallbackTo = mail.to.map((t) => t.name || t.email).filter(Boolean);
  const detailToLabel = (toRecipients.length > 0 ? toRecipients : fallbackTo).join(", ");
  const latestConversationItem = conversationItems[conversationItems.length - 1];
  const replyTargetItem =
    [...conversationItems].reverse().find((item) => item.sender?.email?.trim() !== props.currentUserEmail) ?? latestConversationItem;
  const senderName = replyTargetItem?.sender?.name?.trim() || props.detailData?.sender?.name?.trim() || mail.from.name;
  const senderEmail = replyTargetItem?.sender?.email?.trim() || props.detailData?.sender?.email?.trim() || mail.from.email;
  const labels = props.availableLabels ?? [];
  const selectedLabelIds = props.selectedLabelIds ?? [];
  const isSystemMessage =
    props.detailData?.message?.senderType === "SYSTEM" ||
    mail.senderType === "SYSTEM" ||
    props.detailData?.message?.kind === "SYSTEM_MESSAGE" ||
    props.detailData?.message?.kind === "SYSTEM_NOTIFICATION" ||
    mail.kind === "SYSTEM_MESSAGE" ||
    mail.kind === "SYSTEM_NOTIFICATION";
  const isScheduledMessage = mail.folder === "scheduled";
  const canReply = !isSystemMessage && !isScheduledMessage && props.detailData?.permissions?.canReply !== false;
  const canForward = !isSystemMessage && !isScheduledMessage && props.detailData?.permissions?.canForward !== false;
  const parentMessageId = latestConversationItem?.id ?? mail.messageId ?? mail.id;
  const replySubject = mail.subject.startsWith("Re:") ? mail.subject : `Re: ${mail.subject}`;
  const forwardSubject = mail.subject.startsWith("Fwd:") ? mail.subject : `Fwd: ${mail.subject}`;
  const startInlineComposer = (mode: "reply" | "forward") => {
    setInlineMode(mode);
    setInlineTo(mode === "reply" ? senderEmail : "");
    setInlineCc("");
    setInlineBcc("");
    setInlineBody("");
    setInlineBodyJson(null);
    setInlineAttachmentIds([]);
    setInlineDraftId(null);
    setInlineError(null);
  };
  const closeInlineComposer = () => {
    setInlineMode(null);
    setInlineBody("");
    setInlineBodyJson(null);
    setInlineAttachmentIds([]);
    setInlineDraftId(null);
    setInlineError(null);
  };
  const inlineSubject = inlineMode === "forward" ? forwardSubject : replySubject;
  const handleInlineSend = async (overrides?: { to: string; cc: string; bcc: string }) => {
    if (!inlineMode || inlineSending) return;
    const nextTo = overrides?.to ?? inlineTo;
    const nextCc = overrides?.cc ?? inlineCc;
    const nextBcc = overrides?.bcc ?? inlineBcc;
    if (!nextTo.trim() || !inlineBody.trim()) {
      setInlineError("Completa destinatario y cuerpo.");
      return;
    }
    setInlineSending(true);
    setInlineError(null);
    try {
      await props.onInlineComposeSend({
        mode: inlineMode,
        parentMessageId,
        to: nextTo,
        cc: nextCc,
        bcc: nextBcc,
        subject: inlineSubject,
        body: inlineBody,
        bodyJson: inlineBodyJson,
        attachmentIds: inlineAttachmentIds,
      });
      closeInlineComposer();
    } catch {
      setInlineError("No se pudo enviar el mensaje.");
    } finally {
      setInlineSending(false);
    }
  };
  const expandInlineComposer = () => {
    if (!inlineMode) return;
    props.onComposePrefill({
      to: inlineTo,
      cc: inlineCc,
      bcc: inlineBcc,
      subject: inlineSubject,
      body: inlineBody,
      bodyJson: inlineBodyJson,
      attachmentIds: inlineAttachmentIds,
      mode: inlineMode,
      parentMessageId,
    });
    closeInlineComposer();
  };
  const getItemSenderName = (item: DetailThreadItem) =>
    item.sender?.name?.trim() || (item.senderType === "SYSTEM" ? "Sistema" : "Usuario");
  const getItemSenderEmail = (item: DetailThreadItem) =>
    item.sender?.email?.trim() || (item.senderType === "SYSTEM" ? "no-reply@eunoia.local" : "usuario@eunoia.local");
  const getItemSenderAvatarUrl = (item: DetailThreadItem, email: string) => {
    const senderAvatarUrl = resolveProfileAvatarUrl(item.sender?.avatarUrl);
    if (senderAvatarUrl) return senderAvatarUrl;
    if (email.trim().toLowerCase() === props.currentUserEmail.trim().toLowerCase()) {
      return props.currentUserAvatarUrl ?? "";
    }
    return "";
  };
  const getItemToLabel = (item: DetailThreadItem) => {
    const itemRecipients = item.recipients?.filter((recipient) => Boolean(recipient?.recipientEmail?.trim())) ?? [];
    const itemToRecipients = itemRecipients
      .filter((recipient) => (recipient.recipientType ?? "TO").toUpperCase() === "TO")
      .map((recipient) => recipient.recipientEmail!.trim());
    const selectedRecipients = itemToRecipients.length > 0 ? itemToRecipients : toRecipients;
    if (selectedRecipients.some((email) => email === props.currentUserEmail)) return "mi";
    return selectedRecipients.join(", ") || detailToLabel;
  };
  const executeAction = async (actionId: string) => {
    if (busyActionId) return;
    setBusyActionId(actionId);
    try {
      await props.onExecuteAction(actionId);
    } finally {
      setBusyActionId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <div className="h-12 flex items-center gap-1 px-4 border-b border-border shrink-0">
        <button onClick={props.onBack} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center" title="Volver">
          <ArrowLeft className="size-5" />
        </button>
        {isScheduledMessage ? (
          <>
            <button
              onClick={() => props.onSendScheduledNow?.(mail.id)}
              className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
              title="Enviar ahora"
            >
              <SendHorizontal className="size-5" />
            </button>
            <button
              onClick={() => props.onRescheduleScheduled?.(mail.id)}
              className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
              title="Reprogramar"
            >
              <CalendarClock className="size-5" />
            </button>
            <button
              onClick={() => props.onCancelScheduled?.(mail.id)}
              className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
              title="Cancelar programación"
            >
              <Trash2 className="size-5" />
            </button>
          </>
        ) : (
        <button
          onClick={() => {
            props.onDelete(mail.id);
            props.onBack();
          }}
          className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
          title="Eliminar"
        >
          <Trash2 className="size-5" />
        </button>
        )}
        {mail.folder === "trash" ? (
          <button
            onClick={() => {
              props.onRestore(mail.id);
              props.onBack();
            }}
            className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
            title="Restaurar"
          >
            <LiaTrashRestoreAltSolid className="size-5" />
          </button>
        ) : null}
        {!isScheduledMessage ? (
          <button
            onClick={() => props.onSetRead(mail.id, !mail.read)}
            className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
            title={mail.read ? "Marcar como no leido" : "Marcar como leido"}
          >
            {mail.read ? <MailIcon className="size-5" /> : <MailOpen className="size-5" />}
          </button>
        ) : null}
        {canForward ? (
          <button
            onClick={() => startInlineComposer("forward")}
            className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
            title="Reenviar"
          >
            <Forward className="size-5" />
          </button>
        ) : null}
        <button className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center" title="Imprimir">
          <Printer className="size-5" />
        </button>
        <button className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center">
          <MoreVertical className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-12 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-6">
            <h1 className="text-2xl font-normal">{normalizeConversationSubject(mail.subject)}</h1>
            <button onClick={() => props.onToggleStar(mail.id)} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center shrink-0">
              <Star className={cn("size-5", mail.starred ? "fill-mail-star text-mail-star" : "text-muted-foreground")} />
            </button>
          </div>

          <div className="space-y-8">
            {conversationItems.map((threadItem, index) => {
              const itemSenderName = getItemSenderName(threadItem);
              const itemSenderEmail = getItemSenderEmail(threadItem);
              const itemSenderAvatarUrl = getItemSenderAvatarUrl(threadItem, itemSenderEmail);
              const previousSenderEmail = index > 0 ? getItemSenderEmail(conversationItems[index - 1]) : null;
              const showAvatar = index === 0 || previousSenderEmail !== itemSenderEmail;
              const forwardedPreview = getForwardedMessagePreview(threadItem.bodyJson);
	              const itemAttachments = (threadItem.attachments ?? []).map(normalizeDetailAttachment);
	              const itemFileAttachments = itemAttachments.filter((attachment) => !isInlineImageAttachment(attachment));
	              const itemImageAttachments = itemAttachments.filter((attachment) => isInlineImageAttachment(attachment));
                const itemActions = threadItem.actions ?? [];

              return (
                <article key={threadItem.id} className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white",
                      !showAvatar && "invisible",
                    )}
                    style={{ background: props.avatarColor(itemSenderEmail) }}
                  >
                    {itemSenderAvatarUrl ? (
                      <img
                        src={itemSenderAvatarUrl}
                        alt={`Foto de perfil de ${itemSenderName}`}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      props.initialsOf(itemSenderName)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold">{itemSenderName}</span>
                      <span className="text-xs text-muted-foreground">&lt;{itemSenderEmail}&gt;</span>
                      {threadItem.threadLabel ? (
                        <span className="rounded-full bg-mail-hover px-2 py-0.5 text-xs text-muted-foreground">{threadItem.threadLabel}</span>
                      ) : null}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {props.formatFullDate(threadItem.sentAt ?? threadItem.createdAt)}
                      </span>
                    </div>
                    <div className="mb-3 text-xs text-muted-foreground">{`Para: ${getItemToLabel(threadItem)}`}</div>
                    {index === 0 && ccRecipients.length > 0 ? (
                      <div className="mb-1 text-xs text-muted-foreground">{`CC: ${ccRecipients.join(", ")}`}</div>
                    ) : null}
                    {index === 0 && bccRecipients.length > 0 ? (
                      <div className="mb-1 text-xs text-muted-foreground">{`BCC: ${bccRecipients.join(", ")}`}</div>
                    ) : null}
                    <div
                      className="prose prose-sm max-w-none text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sanitizeMailHtml(threadItem.bodyHtml) }}
                    />

                    {index === 0 && labels.length > 0 ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Tag className="size-3.5" />
                          Etiquetas
                        </span>
                        {labels.map((label) => {
                          const selected = selectedLabelIds.includes(label.id);
                          return (
                            <button
                              key={label.id}
                              onClick={() => props.onToggleLabel?.(mail.messageId ?? mail.id, label.id, selected)}
                              className={cn(
                                "rounded-full border px-2 py-1 text-xs",
                                selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {label.name}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

	                    {forwardedPreview ? (
                      <div className="mt-4 rounded-md bg-muted/20 p-3 text-sm">
                        <p className="mb-2 font-medium">Mensaje reenviado</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{forwardedPreview.senderName || "Usuario"}</span>
                          {forwardedPreview.senderEmail ? <span>&lt;{forwardedPreview.senderEmail}&gt;</span> : null}
                          {forwardedPreview.sentAt ? <span>{props.formatFullDate(forwardedPreview.sentAt)}</span> : null}
                        </div>
                        <p className="mt-2 text-sm font-medium">{forwardedPreview.subject || "(Sin asunto)"}</p>
                        {forwardedPreview.bodyPreview ? (
                          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{forwardedPreview.bodyPreview}</p>
                        ) : null}
                      </div>
	                    ) : null}

                    {itemActions.length > 0 ? (
                      <div className="mt-4 flex flex-col gap-2">
                        {itemActions.map((action) => (
                          <MailActionBlock
                            key={action.id}
                            action={action}
                            busy={busyActionId === action.id}
                            onExecute={executeAction}
                          />
                        ))}
                      </div>
                    ) : null}

	                    {itemImageAttachments.length > 0 ? (
                      <div className="mt-6">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                          <Paperclip className="size-4" />
                          {itemImageAttachments.length} imagen(es)
                        </div>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                          {itemImageAttachments.map((attachment) => {
                            const previewUrl = imagePreviewUrls[attachment.id];
                            return previewUrl ? (
                              <button
                                key={attachment.id}
                                type="button"
                                onClick={() => setPreviewIndex(previewableImageAttachments.findIndex((item) => item.id === attachment.id))}
                                className="group overflow-hidden rounded-md border border-border bg-mail-surface text-left transition hover:border-primary/40 hover:bg-mail-hover"
                                title={attachment.name}
                              >
                                <img
                                  src={previewUrl}
                                  alt={attachment.name}
                                  className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                                  loading="lazy"
                                />
                                <span className="block truncate px-2 py-1.5 text-xs text-muted-foreground">{attachment.name}</span>
                              </button>
                            ) : (
                              <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex max-w-xl items-center gap-3 rounded-md border border-border bg-mail-surface px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-mail-hover"
                              >
                                <ImageIcon className="size-5 shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1 truncate text-mail-accent underline underline-offset-2">{attachment.name}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">Imagen inexistente</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {itemFileAttachments.length > 0 ? (
                      <div className="mt-6">
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                          <Paperclip className="size-4" />
                          {itemFileAttachments.length} archivo(s)
                        </div>
                        <div className="flex flex-col gap-2">
                          {itemFileAttachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.url}
                              download={attachment.name}
                              className="flex max-w-xl items-center gap-3 rounded-md border border-border bg-mail-surface px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-mail-hover"
                            >
                              <FileText className="size-5 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate text-mail-accent underline underline-offset-2">{attachment.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">{attachment.size}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          {inlineMode ? (
            <div className="mt-8">
              <InlineReplyForwardBox
                mode={inlineMode}
                composeId={`inline-${parentMessageId}`}
                to={inlineTo}
                cc={inlineCc}
                bcc={inlineBcc}
                recipientLabel={`${senderName} <${senderEmail}>`}
                currentUserName={props.currentUserName}
                currentUserEmail={props.currentUserEmail}
                currentUserAvatarUrl={props.currentUserAvatarUrl}
                initialsOf={props.initialsOf}
                avatarColor={props.avatarColor}
                subject={inlineSubject}
                body={inlineBody}
                bodyJson={inlineBodyJson}
                attachmentIds={inlineAttachmentIds}
                isBusy={inlineSending}
                isSending={inlineSending}
                error={inlineError}
                onModeChange={(mode) => startInlineComposer(mode)}
                onToChange={setInlineTo}
                onCcChange={setInlineCc}
                onBccChange={setInlineBcc}
                onSubjectChange={() => undefined}
                onBodyChange={(value, nextBodyJson) => {
                  setInlineBody(value);
                  setInlineBodyJson(nextBodyJson);
                }}
                onResolveDraftId={async () => {
                  if (inlineDraftId) return inlineDraftId;
                  const draftId = await props.onCreateInlineDraft({
                    to: inlineTo,
                    cc: inlineCc,
                    bcc: inlineBcc,
                    subject: inlineSubject,
                    body: inlineBody,
                    bodyJson: inlineBodyJson,
                    attachmentIds: inlineAttachmentIds,
                  });
                  setInlineDraftId(draftId);
                  return draftId;
                }}
                onAttachmentUploaded={(attachmentId) => setInlineAttachmentIds((prev) => Array.from(new Set([...prev, attachmentId])))}
                onAttachmentRemoved={(attachmentId) => setInlineAttachmentIds((prev) => prev.filter((id) => id !== attachmentId))}
                onUploadAttachment={props.onUploadAttachment}
                onDeleteAttachment={props.onDeleteAttachment}
                onSend={(overrides) => void handleInlineSend(overrides)}
                onDiscard={closeInlineComposer}
                onExpand={expandInlineComposer}
              />
            </div>
          ) : canReply || canForward ? (
            <div className="pl-14 mt-8 flex gap-2">
              {canReply ? (
                <button
                  onClick={() => startInlineComposer("reply")}
                  className="flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm hover:bg-mail-hover"
                >
                  <Reply className="size-4" />
                  Responder
                </button>
              ) : null}
              {canForward ? (
                <button
                  onClick={() => startInlineComposer("forward")}
                  className="flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm hover:bg-mail-hover"
                >
                  <Forward className="size-4" />
                  Reenviar
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <ImagePreviewModal
        open={previewIndex !== null}
        images={previewImages}
        currentIndex={previewIndex ?? 0}
        onClose={() => setPreviewIndex(null)}
        onPrevious={() => setPreviewIndex((current) => (current === null ? 0 : (current - 1 + previewImages.length) % previewImages.length))}
        onNext={() => setPreviewIndex((current) => (current === null ? 0 : (current + 1) % previewImages.length))}
        downloadUrls={previewImages}
        fileNames={previewNames}
      />
    </div>
  );
}
