import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Trash2,
  Mail as MailIcon,
  MailOpen,
  Reply,
  Forward,
  Star,
  Printer,
  MoreVertical,
  Paperclip,
  Tag,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import type { Mail } from "../types/mail-ui.types";
import { cn } from "@/shared/lib/utils";
import { LiaTrashRestoreAltSolid } from "react-icons/lia";
import type { MailLabelItem } from "../types/message.types";
import { ImagePreviewModal } from "@/shared/components/components/ImagePreviewModal";
import { isInlineImageAttachment, removeBrokenMailBodyImages } from "../utils/mail-attachments.utils";
import { downloadAttachmentBlobUrl } from "../services/messages.service";
import InlineReplyForwardBox from "./InlineReplyForwardBox";

interface Props {
  mail: Mail | null;
  detailData?: {
    message?: {
      kind?: "SYSTEM_NOTIFICATION" | "USER_MESSAGE" | "SYSTEM_MESSAGE";
      senderType?: "USER" | "SYSTEM";
    } | null;
    sender?: { id?: string; name?: string; email?: string } | null;
    recipients?: Array<{ id?: string; recipientEmail?: string; recipientType?: string }>;
    thread?: Array<{ id: string; subject: string; bodyHtml: string; createdAt: string; sentAt?: string | null }>;
    permissions?: { canReply?: boolean; canForward?: boolean };
  } | null;
  currentUserEmail: string;
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
  formatFullDate: (iso: string) => string;
  initialsOf: (name: string) => string;
  avatarColor: (seed: string) => string;
}

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
  const attachments = mail?.attachments ?? [];
  const imageAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.url && isInlineImageAttachment(attachment)),
    [attachments],
  );
  const fileAttachments = useMemo(
    () => attachments.filter((attachment) => !isInlineImageAttachment(attachment)),
    [attachments],
  );
  const previewableImageAttachments = imageAttachments.filter((attachment) => Boolean(imagePreviewUrls[attachment.id]));
  const previewImages = previewableImageAttachments.map((attachment) => imagePreviewUrls[attachment.id]);
  const previewNames = previewableImageAttachments.map((attachment) => attachment.name);
  const cleanBodyHtml = removeBrokenMailBodyImages(mail?.body ?? "");

  useEffect(() => {
    let cancelled = false;
    const createdObjectUrls: string[] = [];

    setImagePreviewUrls({});

    imageAttachments.forEach((attachment) => {
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
  }, [imageAttachments]);

  if (!mail) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Mensaje no encontrado</div>;
  }

  const isSent = mail.folder === "sent";
  const senderName = props.detailData?.sender?.name?.trim() || mail.from.name;
  const senderEmail = props.detailData?.sender?.email?.trim() || mail.from.email;
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
  const threadItems = props.detailData?.thread ?? [];
  const labels = props.availableLabels ?? [];
  const selectedLabelIds = props.selectedLabelIds ?? [];
  const isSystemMessage =
    props.detailData?.message?.senderType === "SYSTEM" ||
    mail.senderType === "SYSTEM" ||
    props.detailData?.message?.kind === "SYSTEM_MESSAGE" ||
    props.detailData?.message?.kind === "SYSTEM_NOTIFICATION" ||
    mail.kind === "SYSTEM_MESSAGE" ||
    mail.kind === "SYSTEM_NOTIFICATION";
  const canReply = !isSystemMessage && props.detailData?.permissions?.canReply !== false;
  const canForward = !isSystemMessage && props.detailData?.permissions?.canForward !== false;
  const parentMessageId = mail.messageId ?? mail.id;
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

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <div className="h-12 flex items-center gap-1 px-4 border-b border-border shrink-0">
        <button onClick={props.onBack} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center" title="Volver">
          <ArrowLeft className="size-5" />
        </button>
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
        <button
          onClick={() => props.onSetRead(mail.id, !mail.read)}
          className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
          title={mail.read ? "Marcar como no leido" : "Marcar como leido"}
        >
          {mail.read ? <MailIcon className="size-5" /> : <MailOpen className="size-5" />}
        </button>
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
            <h1 className="text-2xl font-normal">{mail.subject || "(Sin asunto)"}</h1>
            <button onClick={() => props.onToggleStar(mail.id)} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center shrink-0">
              <Star className={cn("size-5", mail.starred ? "fill-mail-star text-mail-star" : "text-muted-foreground")} />
            </button>
          </div>

          <div className="flex items-start gap-4 mb-4">
            <div className="size-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0" style={{ background: props.avatarColor(senderEmail) }}>
              {props.initialsOf(senderName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-semibold text-sm">{senderName}</span>
                <span className="text-xs text-muted-foreground">&lt;{senderEmail}&gt;</span>
                <span className="ml-auto text-xs text-muted-foreground">{props.formatFullDate(mail.date)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isSent
                  ? `Para: ${detailToLabel}`
                  : `Para: ${mail.to.find((t) => t.email === props.currentUserEmail) ? "mi" : detailToLabel}`}
              </div>
              {ccRecipients.length > 0 ? (
                <div className="text-xs text-muted-foreground mt-1">{`CC: ${ccRecipients.join(", ")}`}</div>
              ) : null}
              {bccRecipients.length > 0 ? (
                <div className="text-xs text-muted-foreground mt-1">{`BCC: ${bccRecipients.join(", ")}`}</div>
              ) : null}
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-sm leading-relaxed pl-14" dangerouslySetInnerHTML={{ __html: cleanBodyHtml }} />

          {labels.length > 0 ? (
            <div className="pl-14 mt-4 flex flex-wrap items-center gap-2">
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

          {imageAttachments.length > 0 ? (
            <div className="pl-14 mt-6">
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                <Paperclip className="size-4" />
                {imageAttachments.length} imagen(es)
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                {imageAttachments.map((a) => (
                  imagePreviewUrls[a.id] ? (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setPreviewIndex(previewableImageAttachments.findIndex((attachment) => attachment.id === a.id))}
                    className="group overflow-hidden rounded-md border border-border bg-mail-surface text-left transition hover:border-primary/40 hover:bg-mail-hover"
                    title={a.name}
                  >
                    <img
                      src={imagePreviewUrls[a.id]}
                      alt={a.name}
                      className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                    <span className="block truncate px-2 py-1.5 text-xs text-muted-foreground">{a.name}</span>
                  </button>
                  ) : (
                    <div
                      key={a.id}
                      className="flex aspect-square flex-col items-center justify-center rounded-md border border-border bg-mail-surface text-muted-foreground"
                    >
                      <ImageIcon className="mb-2 size-6" />
                      <span className="max-w-full truncate px-2 text-xs">{a.name}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          ) : null}

          {fileAttachments.length > 0 ? (
            <div className="pl-14 mt-6">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Paperclip className="size-4" />
                {fileAttachments.length} archivo(s)
              </div>
              <div className="flex flex-col gap-2">
                {fileAttachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    download={a.name}
                    className="flex max-w-xl items-center gap-3 rounded-md border border-border bg-mail-surface px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-mail-hover"
                  >
                    <FileText className="size-5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-mail-accent underline underline-offset-2">{a.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{a.size}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {inlineMode ? (
            <div className="pl-14 mt-8">
              <InlineReplyForwardBox
                mode={inlineMode}
                composeId={`inline-${parentMessageId}`}
                to={inlineTo}
                cc={inlineCc}
                bcc={inlineBcc}
                recipientLabel={`${senderName} <${senderEmail}>`}
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
                  className="flex items-center gap-2 px-5 py-2 rounded-full border border-border hover:bg-mail-hover text-sm"
                >
                  <Reply className="size-4" />
                  Responder
                </button>
              ) : null}
              {canForward ? (
                <button
                  onClick={() => startInlineComposer("forward")}
                  className="flex items-center gap-2 px-5 py-2 rounded-full border border-border hover:bg-mail-hover text-sm"
                >
                  <Forward className="size-4" />
                  Reenviar
                </button>
              ) : null}
            </div>
          ) : null}

          {threadItems.length > 1 ? (
            <div className="pl-14 mt-8 space-y-3">
              <p className="text-sm font-medium text-foreground">Hilo de conversacion</p>
              {threadItems.map((threadItem) => (
                <article key={threadItem.id} className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{threadItem.subject || "(Sin asunto)"}</span>
                    <span className="text-xs text-muted-foreground">
                      {props.formatFullDate(threadItem.sentAt ?? threadItem.createdAt)}
                    </span>
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: removeBrokenMailBodyImages(threadItem.bodyHtml) }}
                  />
                </article>
              ))}
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
