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
} from "lucide-react";
import type { Mail } from "../types/mail-ui.types";
import { cn } from "@/shared/lib/utils";
import { LiaTrashRestoreAltSolid } from "react-icons/lia";
import type { MailLabelItem } from "../types/message.types";

interface Props {
  mail: Mail | null;
  detailData?: {
    sender?: { id?: string; name?: string; email?: string } | null;
    recipients?: Array<{ id?: string; recipientEmail?: string; recipientType?: string }>;
    thread?: Array<{ id: string; subject: string; bodyHtml: string; createdAt: string; sentAt?: string | null }>;
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
    mode?: "new" | "reply" | "forward";
    parentMessageId?: string | null;
  }) => void;
  formatFullDate: (iso: string) => string;
  initialsOf: (name: string) => string;
  avatarColor: (seed: string) => string;
}

export default function MailDetail(props: Props) {
  const mail = props.mail;

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
        <button
          onClick={() =>
            props.onComposePrefill({
              to: (toRecipients.length > 0 ? toRecipients : mail.to.map((t) => t.email).filter(Boolean)).join(", "),
              cc: ccRecipients.join(", "),
              bcc: bccRecipients.join(", "),
              subject: mail.subject.startsWith("Fwd:") ? mail.subject : `Fwd: ${mail.subject}`,
              body: `<br/><br/>---------- Mensaje reenviado ----------<br/><b>De:</b> ${senderName} &lt;${senderEmail}&gt;<br/><b>Asunto:</b> ${mail.subject}<br/><br/>${mail.body}`,
              mode: "forward",
              parentMessageId: mail.messageId ?? mail.id,
            })
          }
          className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center"
          title="Reenviar"
        >
          <Forward className="size-5" />
        </button>
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

          <div className="prose prose-sm max-w-none text-sm leading-relaxed pl-14" dangerouslySetInnerHTML={{ __html: mail.body }} />

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

          {mail.attachments && mail.attachments.length > 0 ? (
            <div className="pl-14 mt-6">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Paperclip className="size-4" />
                {mail.attachments.length} adjunto(s)
              </div>
              <div className="flex flex-wrap gap-2">
                {mail.attachments.map((a) => (
                  <a key={a.id} href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-mail-surface hover:bg-mail-hover border border-border text-sm">
                    <span className="text-mail-accent underline">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{a.size}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="pl-14 mt-8 flex gap-2">
            <button
              onClick={() =>
                props.onComposePrefill({
                  to: senderEmail,
                  cc: "",
                  bcc: "",
                  subject: mail.subject.startsWith("Re:") ? mail.subject : `Re: ${mail.subject}`,
                  body: `<br/><br/>El ${props.formatFullDate(mail.date)}, ${senderName} escribio:<br/><blockquote style="border-left:2px solid #ccc;padding-left:10px;margin-left:0;color:#666">${mail.body}</blockquote>`,
                  mode: "reply",
                  parentMessageId: mail.messageId ?? mail.id,
                })
              }
              className="flex items-center gap-2 px-5 py-2 rounded-full border border-border hover:bg-mail-hover text-sm"
            >
              <Reply className="size-4" />
              Responder
            </button>
            <button
              onClick={() =>
                props.onComposePrefill({
                  to: (toRecipients.length > 0 ? toRecipients : mail.to.map((t) => t.email).filter(Boolean)).join(", "),
                  cc: ccRecipients.join(", "),
                  bcc: bccRecipients.join(", "),
                  subject: `Fwd: ${mail.subject}`,
                  body: `<br/><br/>---------- Mensaje reenviado ----------<br/>${mail.body}`,
                  mode: "forward",
                  parentMessageId: mail.messageId ?? mail.id,
                })
              }
              className="flex items-center gap-2 px-5 py-2 rounded-full border border-border hover:bg-mail-hover text-sm"
            >
              <Forward className="size-4" />
              Reenviar
            </button>
          </div>

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
                    dangerouslySetInnerHTML={{ __html: threadItem.bodyHtml }}
                  />
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
