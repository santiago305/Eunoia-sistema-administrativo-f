import { useRef, useState } from "react";
import { ChevronDown, Forward, Maximize2, Minus, Reply, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { MailLabelItem } from "../types/message.types";
import MailComposerSurface from "./composer/MailComposerSurface";
import { Popover } from "@/shared/components/modales/Popover";

export type NotificationComposeDraft = {
  id: string;
  minimized: boolean;
  editingDraftId: string | null;
  mode: "new" | "reply" | "forward";
  parentMessageId: string | null;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  bodyJson?: Record<string, unknown> | null;
  error: string | null;
  selectedLabelIds: string[];
  attachmentIds?: string[];
};

interface Props {
  draft: NotificationComposeDraft;
  labels?: MailLabelItem[];
  isSaving?: boolean;
  isSending?: boolean;
  isDiscarding?: boolean;
  onToggleMinimize: (composeId: string) => void;
  onClose: (composeId: string) => void;
  onToChange: (composeId: string, value: string) => void;
  onCcChange: (composeId: string, value: string) => void;
  onBccChange: (composeId: string, value: string) => void;
  onSubjectChange: (composeId: string, value: string) => void;
  onBodyChange: (composeId: string, value: string, bodyJson: Record<string, unknown> | null, bodyText: string) => void;
  onModeChange: (composeId: string, mode: "reply" | "forward") => void;
  onToggleLabel: (composeId: string, labelId: string) => void;
  onResolveDraftId: (composeId: string) => Promise<string>;
  onAttachmentUploaded: (composeId: string, attachmentId: string) => void;
  onAttachmentRemoved: (composeId: string, attachmentId: string) => void;
  onUploadAttachment: (input: { composeId: string; file: File; draftId: string; kind: "image" | "file" }) => Promise<{ id: string }>;
  onDeleteAttachment: (attachmentId: string) => Promise<void>;
  onDiscard: (composeId: string) => void | Promise<void>;
  onSend: (
    composeId: string,
    overrides?: Partial<
      Pick<NotificationComposeDraft, "to" | "cc" | "bcc" | "subject" | "body" | "selectedLabelIds"> & {
        attachmentIds?: string[];
        bodyJson?: Record<string, unknown> | null;
      }
    >,
  ) => void | Promise<void>;
  onSchedule: (
    composeId: string,
    scheduledAt: string,
    overrides?: Partial<
      Pick<NotificationComposeDraft, "to" | "cc" | "bcc" | "subject" | "body" | "selectedLabelIds"> & {
        attachmentIds?: string[];
        bodyJson?: Record<string, unknown> | null;
      }
    >,
  ) => void | Promise<void>;
}

const titleByMode = (draft: NotificationComposeDraft) => {
  if (draft.editingDraftId) return "Editar borrador";
  if (draft.mode === "reply") return "Responder";
  if (draft.mode === "forward") return "Reenviar";
  return "Mensaje nuevo";
};

export default function NotificationComposeModal({
  draft,
  labels,
  isSaving = false,
  isSending = false,
  isDiscarding = false,
  onToggleMinimize,
  onClose,
  onToChange,
  onCcChange,
  onBccChange,
  onSubjectChange,
  onBodyChange,
  onModeChange,
  onToggleLabel,
  onResolveDraftId,
  onAttachmentUploaded,
  onAttachmentRemoved,
  onUploadAttachment,
  onDeleteAttachment,
  onDiscard,
  onSend,
  onSchedule,
}: Props) {
  const isBusy = isSaving || isSending || isDiscarding;
  const showLabels = draft.mode === "new";
  const showReplyHeader = draft.mode === "reply";
  const modeMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  if (draft.minimized) {
    return (
      <div
        data-compose-modal
        data-compose-id={draft.id}
        className="w-72 cursor-pointer rounded-t-lg border border-border bg-background shadow-compose"
        onClick={() => onToggleMinimize(draft.id)}
      >
        <div className="flex items-center justify-between rounded-t-lg bg-primary/5 px-3 py-2 text-mail-compose-foreground">
          <span className="truncate text-sm font-medium">{draft.subject || titleByMode(draft)}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!isBusy) onToggleMinimize(draft.id);
              }}
              disabled={isBusy}
              className="flex size-6 items-center justify-center rounded hover:bg-black/10"
              title="Restaurar"
            >
              <Maximize2 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!isBusy) onClose(draft.id);
              }}
              disabled={isBusy}
              className="flex size-6 items-center justify-center rounded hover:bg-black/10"
              title="Cerrar"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-compose-modal
      data-compose-id={draft.id}
      className={cn(
        "flex h-[min(38rem,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] min-h-0 w-[min(540px,calc(100vw-2rem))] shrink-0 flex-col overflow-hidden rounded-t-lg border border-border bg-background shadow-2xl",
      )}
    >
      <div className="flex shrink-0 items-center justify-between rounded-t-lg bg-primary/5 px-4 py-2 text-mail-compose-foreground">
        <span className="text-sm font-medium">{titleByMode(draft)}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (!isBusy) onToggleMinimize(draft.id);
            }}
            disabled={isBusy}
            className="flex size-7 items-center justify-center rounded hover:bg-black/10"
            title="Minimizar"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isBusy) onClose(draft.id);
            }}
            disabled={isBusy}
            className="flex size-7 items-center justify-center rounded hover:bg-black/10"
            title="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {showReplyHeader ? (
        <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-mail-hover text-muted-foreground">
            <Reply className="size-4" />
          </span>
          <button
            ref={modeMenuAnchorRef}
            type="button"
            onClick={() => setModeMenuOpen((value) => !value)}
            className="flex size-8 items-center justify-center rounded-full hover:bg-mail-hover"
            title="Cambiar modo"
          >
            <ChevronDown className="size-4" />
          </button>
          <Popover
            open={modeMenuOpen}
            onClose={() => setModeMenuOpen(false)}
            anchorRef={modeMenuAnchorRef}
            placement="bottom-start"
            offset={6}
            zIndex={10000}
            hideHeader
            className="w-36 rounded-md border border-border bg-popover shadow-popover"
            bodyClassName="p-1"
          >
            <button
              type="button"
              onClick={() => {
                onModeChange(draft.id, "reply");
                setModeMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-mail-hover"
            >
              <Reply className="size-4" />
              Responder
            </button>
            <button
              type="button"
              onClick={() => {
                onModeChange(draft.id, "forward");
                setModeMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-mail-hover"
            >
              <Forward className="size-4" />
              Reenviar
            </button>
          </Popover>
          <div className="min-w-0 flex-1 text-sm">
            <span className="font-medium">Responder</span>
            <span className="ml-2 truncate text-muted-foreground">{draft.to}</span>
          </div>
        </div>
      ) : null}

      <MailComposerSurface
        composeId={draft.id}
        to={draft.to}
        cc={draft.cc}
        bcc={draft.bcc}
        subject={draft.subject}
        body={draft.body}
        bodyJson={draft.bodyJson}
        attachmentIds={draft.attachmentIds}
        labels={labels}
        selectedLabelIds={showLabels ? draft.selectedLabelIds : []}
        showSubject={draft.mode === "new"}
        showRecipients={draft.mode !== "reply"}
        showLabels={showLabels}
        showSchedule={draft.mode === "new"}
        isBusy={isBusy}
        isSending={isSending}
        error={draft.error}
        onToChange={(value) => onToChange(draft.id, value)}
        onCcChange={(value) => onCcChange(draft.id, value)}
        onBccChange={(value) => onBccChange(draft.id, value)}
        onSubjectChange={(value) => onSubjectChange(draft.id, value)}
        onBodyChange={(value, nextBodyJson, bodyText) => onBodyChange(draft.id, value, nextBodyJson, bodyText)}
        onToggleLabel={(labelId) => onToggleLabel(draft.id, labelId)}
        onResolveDraftId={async () => draft.editingDraftId || onResolveDraftId(draft.id)}
        onAttachmentUploaded={(attachmentId) => onAttachmentUploaded(draft.id, attachmentId)}
        onAttachmentRemoved={(attachmentId) => onAttachmentRemoved(draft.id, attachmentId)}
        onUploadAttachment={({ file, draftId, kind }) => onUploadAttachment({ composeId: draft.id, file, draftId, kind })}
        onDeleteAttachment={onDeleteAttachment}
        onDiscard={() => onDiscard(draft.id)}
        onSend={(overrides) => onSend(draft.id, overrides)}
        onSchedule={(scheduledAt, overrides) => onSchedule(draft.id, scheduledAt, overrides)}
      />
    </div>
  );
}
