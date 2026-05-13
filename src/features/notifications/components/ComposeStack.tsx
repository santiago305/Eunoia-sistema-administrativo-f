import NotificationComposeModal from "./ComposeModal";
import type { MailLabelItem } from "../types/message.types";

interface Props {
  open: boolean;
  minimized: boolean;
  editingDraft: boolean;
  recipients: string;
  subject: string;
  body: string;
  error?: string;
  labels?: MailLabelItem[];
  selectedLabelIds?: string[];
  onToggleLabel?: (labelId: string) => void;
  onToggleMinimize: () => void;
  onClose: () => void;
  onRecipientsChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  onSaveDraft: () => void | Promise<void>;
}

export default function NotificationComposeStack(props: Props) {
  if (!props.open) return null;

  return (
    <div className="fixed bottom-0 right-6 z-[9999] flex items-end gap-2">
      <NotificationComposeModal {...props} />
    </div>
  );
}