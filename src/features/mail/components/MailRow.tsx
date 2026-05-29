import { Star, Paperclip, Archive, Trash2, MailOpen, Mail as MailIcon, Clock, CalendarClock } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Mail } from "../types/mail-ui.types";
import { cn } from "@/shared/lib/utils";
import { LiaTrashRestoreAltSolid } from "react-icons/lia";
import { Popover } from "@/shared/components/modales/Popover";
import { buildSnoozeQuickOptions, formatSnoozeQuickDate } from "../utils/mail-snooze.utils";

interface Props {
  mail: Mail;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  onSetRead: (id: string, read: boolean) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onArchive: (id: string) => void;
  onSnooze: (id: string, snoozedUntil?: string) => void;
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
  onRestore,
  onArchive,
  onSnooze,
  formatMailDate,
  initialsOf,
  avatarColor,
}: Props) {
  const snoozeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [snoozePopoverOpen, setSnoozePopoverOpen] = useState(false);
  const snoozeQuickOptions = useMemo(() => buildSnoozeQuickOptions(new Date()), [snoozePopoverOpen]);
  const isScheduledFolder = mail.folder === "scheduled";

  return (
    <div
      onClick={() => onOpen(mail.id)}
      className={cn(
        "group flex items-center gap-3 px-4 h-10 cursor-pointer border-b border-border/40 hover:shadow-[inset_1px_0_0_oklch(0.85_0.005_260),inset_-1px_0_0_oklch(0.85_0.005_260),0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] hover:z-10 relative transition-shadow",
        mail.read ? "" : "bg-mail-row-unread",
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(mail.id);
          }}
          className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center shrink-0"
          title={mail.starred ? "Quitar destacado" : "Destacar"}
          aria-label={mail.starred ? "Quitar destacado" : "Destacar"}
        >
          <Star
            strokeWidth={mail.starred ? 2.5 : 2}
            className={cn(
              "size-4 transition-colors",
              mail.starred
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
            )}
          />
        </button>
      </button>

      {mail.from.avatar ? (
        <img
          src={mail.from.avatar}
          alt={`Avatar de ${mail.from.name}`}
          loading="lazy"
          className="size-6 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="size-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ background: avatarColor(mail.from.email) }}>
          {initialsOf(mail.from.name)}
        </div>
      )}

      <div className={cn("w-44 truncate text-sm shrink-0", mail.read ? "text-foreground/70" : "font-semibold text-foreground")}>
        {mail.from.name}
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-2">
        {mail.threadUnreadCount && mail.threadUnreadCount > 0 ? (
          <span
            className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground"
            aria-label={`${mail.threadUnreadCount} mensajes no leidos`}
          >
            {mail.threadUnreadCount}
          </span>
        ) : null}
        <span className={cn("truncate text-sm", mail.read ? "text-foreground/70" : "font-semibold text-foreground")}>
          {mail.subject || "(Sin asunto)"}
        </span>
        <span className="text-sm text-muted-foreground truncate">— {mail.preview}</span>
      </div>

      {mail.attachments && mail.attachments.length > 0 ? <Paperclip className="size-4 text-muted-foreground shrink-0" /> : null}

      <div className="relative shrink-0 w-32 flex justify-end">
        <span
          className={cn(
            "text-xs whitespace-nowrap group-hover:invisible",
            selected && "invisible",
            snoozePopoverOpen && "invisible",
            mail.read ? "text-muted-foreground" : "font-semibold text-foreground",
          )}
        >
          {formatMailDate(mail.date)}
        </span>
        <div
          className={cn(
            "absolute inset-0 items-center justify-end gap-1 bg-inherit",
            selected || snoozePopoverOpen ? "flex" : "hidden group-hover:flex",
          )}
        >
          {mail.folder === "trash" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore(mail.id);
              }}
              className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center"
              title="Restaurar"
            >
              <LiaTrashRestoreAltSolid className="size-4" />
            </button>
          ) : null}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(mail.id);
            }}
            className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center"
            title={mail.folder === "trash" ? "Eliminar permanentemente" : "Eliminar"}
          >
            <Trash2 className="size-4" />
          </button>
          {!isScheduledFolder ? (
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
          ) : null}
          {mail.folder !== "trash" && !isScheduledFolder ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(mail.id);
              }}
              className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center"
              title={mail.folder === "archived" ? "Desarchivar" : "Archivar"}
            >
              <Archive className="size-4" />
            </button>
          ) : null}
          {mail.folder !== "trash" && !isScheduledFolder ? (
            <>
              <button
                ref={snoozeButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  if (mail.folder === "snoozed") {
                    onSnooze(mail.id);
                    return;
                  }
                  setSnoozePopoverOpen((prev) => !prev);
                }}
                className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center"
                title={mail.folder === "snoozed" ? "Quitar pospuesto" : "Posponer"}
              >
                <Clock className="size-4" />
              </button>
              {mail.folder !== "snoozed" ? (
                <Popover
                  open={snoozePopoverOpen}
                  onClose={() => setSnoozePopoverOpen(false)}
                  anchorRef={snoozeButtonRef}
                  placement="bottom-end"
                  offset={2}
                  hideHeader
                  className="w-[280px] rounded-lg border border-border bg-popover shadow-popover"
                  bodyClassName="px-0 py-2"
                >
                  <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Posponer hasta
                  </div>
                  <div className="flex flex-col ">
                    {snoozeQuickOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSnooze(mail.id, option.date.toISOString());
                          setSnoozePopoverOpen(false);
                        }}
                        className="flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-black/5"
                      >
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{formatSnoozeQuickDate(option.date)}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSnooze(mail.id);
                        setSnoozePopoverOpen(false);
                      }}
                      className="mt-1 flex items-center gap-2 border-t border-border px-4 py-2 text-sm transition-colors hover:bg-black/5"
                    >
                      <CalendarClock className="size-4 text-muted-foreground" />
                      Elegir fecha y hora
                    </button>
                  </div>
                </Popover>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

