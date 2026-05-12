import type { DraftMessageItem, InboxItem, SentMessageItem } from "../../types/message.types";
import MessageEmptyState from "../feedback/MessageEmptyState";
import NotificationMailRow from "./NotificationMailRow";

type UiFolder = "inbox" | "sent" | "drafts" | "trash" | "starred";

interface Props {
  rows: Array<InboxItem | SentMessageItem | DraftMessageItem>;
  folder: UiFolder;
  selectedRecipientIds: string[];
  onToggleSelect: (recipientId: string, checked: boolean) => void;
  onToggleRead: (recipientId: string, value: boolean) => void;
  onToggleStar: (recipientId: string, value: boolean) => void;
  onDelete: (recipientId: string) => void;
  onRestore: (recipientId: string) => void;
  onEditDraft: (draft: DraftMessageItem) => void;
  onDeleteDraft: (draftId: string) => Promise<void>;
  getSenderLabel: (row: InboxItem | SentMessageItem | DraftMessageItem, currentFolder: UiFolder) => string;
  formatMessageDate: (iso?: string | null) => string;
}

export default function NotificationMailList(props: Props) {
  if (!props.rows.length) {
    return <MessageEmptyState text={props.folder === "drafts" ? "No tienes borradores." : "No tienes mensajes en esta bandeja."} />;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      {props.rows.map((row) => (
        <NotificationMailRow
          key={"recipient" in row ? row.recipient.id : row.id}
          row={row}
          folder={props.folder}
          selectedRecipientIds={props.selectedRecipientIds}
          onToggleSelect={props.onToggleSelect}
          onToggleRead={props.onToggleRead}
          onToggleStar={props.onToggleStar}
          onDelete={props.onDelete}
          onRestore={props.onRestore}
          onEditDraft={props.onEditDraft}
          onDeleteDraft={props.onDeleteDraft}
          getSenderLabel={props.getSenderLabel}
          formatMessageDate={props.formatMessageDate}
        />
      ))}
    </div>
  );
}
