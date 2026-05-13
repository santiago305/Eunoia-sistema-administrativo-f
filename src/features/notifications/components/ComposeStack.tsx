import NotificationComposeModal, {
  type NotificationComposeDraft,
} from "./ComposeModal";
import type { MailLabelItem } from "../types/message.types";

interface Props {
  drafts: NotificationComposeDraft[];
  labels?: MailLabelItem[];
  onToggleMinimize: (composeId: string) => void;
  onClose: (composeId: string) => void;
  onRecipientsChange: (composeId: string, value: string) => void;
  onSubjectChange: (composeId: string, value: string) => void;
  onBodyChange: (composeId: string, value: string) => void;
  onToggleLabel: (composeId: string, labelId: string) => void;
  onSend: (
    composeId: string,
    overrides?: Partial<
      Pick<NotificationComposeDraft, "recipients" | "subject" | "body" | "selectedLabelIds">
    >,
  ) => void | Promise<void>;
}

export default function NotificationComposeStack({
  drafts,
  labels,
  onToggleMinimize,
  onClose,
  onRecipientsChange,
  onSubjectChange,
  onBodyChange,
  onToggleLabel,
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
          onToggleMinimize={onToggleMinimize}
          onClose={onClose}
          onRecipientsChange={onRecipientsChange}
          onSubjectChange={onSubjectChange}
          onBodyChange={onBodyChange}
          onToggleLabel={onToggleLabel}
          onSend={onSend}
        />
      ))}
    </div>
  );
}