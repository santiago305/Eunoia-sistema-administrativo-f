import { Inbox } from "lucide-react";
import type { Mail } from "../../../../mail/types";
import MailRow from "./MailRow";

interface Props {
  mails: Mail[];
  selectedIds: Set<string>;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  onSetRead: (id: string, read: boolean) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onSnooze: (id: string) => void;
  formatMailDate: (iso: string) => string;
  initialsOf: (name: string) => string;
  avatarColor: (seed: string) => string;
}

export default function MailList({
  mails,
  selectedIds,
  onOpen,
  onToggleSelect,
  onToggleStar,
  onSetRead,
  onDelete,
  onArchive,
  onSnooze,
  formatMailDate,
  initialsOf,
  avatarColor,
}: Props) {
  if (mails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Inbox className="size-12 opacity-40" />
        <p className="text-sm">No hay mensajes para mostrar</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scroll-area bg-background">
      {mails.map((mail) => (
        <MailRow
          key={mail.id}
          mail={mail}
          selected={selectedIds.has(mail.id)}
          onOpen={onOpen}
          onToggleSelect={onToggleSelect}
          onToggleStar={onToggleStar}
          onSetRead={onSetRead}
          onDelete={onDelete}
          onArchive={onArchive}
          onSnooze={onSnooze}
          formatMailDate={formatMailDate}
          initialsOf={initialsOf}
          avatarColor={avatarColor}
        />
      ))}
    </div>
  );
}
