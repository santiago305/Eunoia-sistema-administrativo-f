import { Star, Paperclip, Archive, Trash2, MailOpen, Mail as MailIcon, Clock } from "lucide-react";
import type { Mail } from "../../../../mail/types";
import { cn } from "@/shared/lib/utils";

interface Props {
  mail: Mail;
  selected: boolean;
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

export default function MailRow({
  mail,
  selected,
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
  return (
    <div
      onClick={() => onOpen(mail.id)}
      className={cn(
        "group flex items-center gap-3 px-4 h-10 cursor-pointer border-b border-border/40 hover:shadow-[inset_1px_0_0_oklch(0.85_0.005_260),inset_-1px_0_0_oklch(0.85_0.005_260),0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] hover:z-10 relative transition-shadow",
        mail.read ? "bg-mail-row-read" : "bg-mail-row-unread",
        selected && "bg-mail-accent/10",
      )}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(mail.id);
        }}
        className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center shrink-0"
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {}}
          className="size-4 accent-mail-accent pointer-events-none"
        />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar(mail.id);
        }}
        className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center shrink-0"
      >
        <Star className={cn("size-4", mail.starred ? "fill-mail-star text-mail-star" : "text-muted-foreground")} />
      </button>

      <div className="size-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ background: avatarColor(mail.from.email) }}>
        {initialsOf(mail.from.name)}
      </div>

      <div className={cn("w-44 truncate text-sm shrink-0", mail.read ? "text-foreground/70" : "font-semibold text-foreground")}>
        {mail.from.name}
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={cn("truncate text-sm", mail.read ? "text-foreground/70" : "font-semibold text-foreground")}>
          {mail.subject || "(Sin asunto)"}
        </span>
        <span className="text-sm text-muted-foreground truncate">— {mail.preview}</span>
      </div>

      {mail.attachments && mail.attachments.length > 0 ? <Paperclip className="size-4 text-muted-foreground shrink-0" /> : null}

      <div className="relative shrink-0 w-32 flex justify-end">
        <span className={cn("text-xs whitespace-nowrap group-hover:invisible", mail.read ? "text-muted-foreground" : "font-semibold text-foreground")}>
          {formatMailDate(mail.date)}
        </span>
        <div className="absolute inset-0 hidden group-hover:flex items-center justify-end gap-1 bg-inherit">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(mail.id);
            }}
            className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center"
            title="Eliminar"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetRead(mail.id, !mail.read);
            }}
            className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center"
            title={mail.read ? "Marcar como no leído" : "Marcar como leído"}
          >
            {mail.read ? <MailIcon className="size-4" /> : <MailOpen className="size-4" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(mail.id);
            }}
            className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center"
            title="Archivar"
          >
            <Archive className="size-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSnooze(mail.id);
            }}
            className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center"
            title="Posponer"
          >
            <Clock className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
