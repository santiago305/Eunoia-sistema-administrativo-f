import NotificationComposeModal, {
  type NotificationComposeDraft,
} from "./ComposeModal";
import type { MailLabelItem } from "../types/message.types";

interface Props {
  drafts: NotificationComposeDraft[];
  labels?: MailLabelItem[];
  savingComposeIds?: Set<string>;
  sendingComposeIds?: Set<string>;
  discardingComposeIds?: Set<string>;
  onToggleMinimize: (composeId: string) => void;
  onClose: (composeId: string) => void;
  onToChange: (composeId: string, value: string) => void;
  onCcChange: (composeId: string, value: string) => void;
  onBccChange: (composeId: string, value: string) => void;
  onSubjectChange: (composeId: string, value: string) => void;
  onBodyChange: (composeId: string, value: string, bodyJson: Record<string, unknown> | null, bodyText: string) => void;
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
      Pick<NotificationComposeDraft, "to" | "cc" | "bcc" | "subject" | "body" | "selectedLabelIds">
      & { attachmentIds?: string[]; bodyJson?: Record<string, unknown> | null }
    >,
  ) => void | Promise<void>;
}

export default function NotificationComposeStack({
  drafts,
  labels,
  savingComposeIds,
  sendingComposeIds,
  discardingComposeIds,
  onToggleMinimize,
  onClose,
  onToChange,
  onCcChange,
  onBccChange,
  onSubjectChange,
  onBodyChange,
  onToggleLabel,
  onResolveDraftId,
  onAttachmentUploaded,
  onAttachmentRemoved,
  onUploadAttachment,
  onDeleteAttachment,
  onDiscard,
  onSend,
}: Props) {
  if (drafts.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-6 z-[9999] flex max-w-[calc(100vw-3rem)] items-end gap-2 overflow-x-auto">
      {drafts.map((draft) => (
        <NotificationComposeModal
          key={draft.id}
          draft={draft}
          labels={labels}
          isSaving={savingComposeIds?.has(draft.id)}
          isSending={sendingComposeIds?.has(draft.id)}
          isDiscarding={discardingComposeIds?.has(draft.id)}
          onToggleMinimize={onToggleMinimize}
          onClose={onClose}
          onToChange={onToChange}
          onCcChange={onCcChange}
          onBccChange={onBccChange}
          onSubjectChange={onSubjectChange}
          onBodyChange={onBodyChange}
          onToggleLabel={onToggleLabel}
          onResolveDraftId={onResolveDraftId}
          onAttachmentUploaded={onAttachmentUploaded}
          onAttachmentRemoved={onAttachmentRemoved}
          onUploadAttachment={onUploadAttachment}
          onDeleteAttachment={onDeleteAttachment}
          onDiscard={onDiscard}
          onSend={onSend}
        />
      ))}
    </div>
  );
}
