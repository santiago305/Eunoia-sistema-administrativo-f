import { useNavigate } from "react-router-dom";
import { Eye, Mail, MailOpen, Star, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { RoutesPaths } from "@/routes/config/routesPaths";
import type { DraftMessageItem, InboxItem, SentMessageItem } from "../../types/message.types";

type UiFolder = "inbox" | "sent" | "drafts" | "trash" | "starred";

interface Props {
  row: InboxItem | SentMessageItem | DraftMessageItem;
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

export default function NotificationMailRow({
  row,
  folder,
  selectedRecipientIds,
  onToggleSelect,
  onToggleRead,
  onToggleStar,
  onDelete,
  onRestore,
  onEditDraft,
  onDeleteDraft,
  getSenderLabel,
  formatMessageDate,
}: Props) {
  const navigate = useNavigate();
  const isInboxRow = "recipient" in row;
  const message = isInboxRow ? row.message : row;
  const recipient = isInboxRow ? row.recipient : null;
  const sender = getSenderLabel(row, folder);
  const title = message?.subject ?? "(Sin asunto)";
  const preview = message?.bodyText ?? "";
  const date = formatMessageDate(message?.sentAt ?? message?.updatedAt ?? message?.createdAt);
  const unread = Boolean(isInboxRow && recipient && !recipient.readAt);
  const detailId = (recipient?.id ?? message?.id ?? "").toString();
  const shortMessageId = (message?.id ?? "").slice(0, 8).toUpperCase();
  const avatarLabel = sender.slice(0, 1).toUpperCase();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => detailId && navigate(RoutesPaths.notificationDetail.replace(":id", detailId))}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (detailId) navigate(RoutesPaths.notificationDetail.replace(":id", detailId));
        }
      }}
      className={cn(
        "group grid h-12 cursor-pointer grid-cols-[auto_auto_auto_170px_1fr_auto] items-center gap-3 border-b border-border/40 px-4 hover:bg-muted/40",
        unread ? "bg-muted/20" : "",
      )}
    >
      {isInboxRow && recipient ? (
        <div
          className="flex size-7 items-center justify-center rounded-full hover:bg-muted"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selectedRecipientIds.includes(recipient.id)}
            onCheckedChange={(value) => onToggleSelect(recipient.id, Boolean(value))}
            aria-label={`Seleccionar mensaje ${title}`}
          />
        </div>
      ) : (
        <span />
      )}

      {isInboxRow && recipient ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleStar(recipient.id, !recipient.starredAt);
          }}
          className="flex size-7 items-center justify-center rounded-full hover:bg-muted"
          aria-label={recipient.starredAt ? "Quitar destacado" : "Marcar como destacado"}
          title={recipient.starredAt ? "Quitar destacado" : "Marcar como destacado"}
        >
          <Star className={cn("size-4", recipient.starredAt ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
        </button>
      ) : (
        <span />
      )}

      <div className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
        {avatarLabel || "U"}
      </div>

      <p className={cn("truncate text-sm", unread ? "font-semibold" : "text-foreground/80")}>{sender}</p>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("truncate text-sm", unread ? "font-semibold" : "text-foreground/80")}>{title}</p>
          <span className="truncate text-sm text-muted-foreground">- {preview}</span>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">ID: {shortMessageId || "-"}</p>
      </div>

      <div className="relative flex w-36 shrink-0 justify-end">
        <span className={cn("text-xs whitespace-nowrap group-hover:invisible", unread ? "font-semibold" : "text-muted-foreground")}>
          {date}
        </span>
        <div className="absolute inset-0 hidden items-center justify-end gap-1 bg-inherit group-hover:flex group-focus-within:flex">
          {detailId ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(RoutesPaths.notificationDetail.replace(":id", detailId));
              }}
              className="flex size-7 items-center justify-center rounded-full hover:bg-muted"
              aria-label="Abrir detalle del mensaje"
              title="Abrir"
            >
              <Eye className="size-4" />
            </button>
          ) : null}

          {isInboxRow && recipient ? (
            <>
              {folder !== "trash" ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleRead(recipient.id, Boolean(recipient.readAt));
                  }}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-muted"
                  aria-label={recipient.readAt ? "Marcar como no leido" : "Marcar como leido"}
                  title={recipient.readAt ? "Marcar como no leido" : "Marcar como leido"}
                >
                  {recipient.readAt ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                </button>
              ) : null}

              {folder === "trash" ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRestore(recipient.id);
                  }}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-muted"
                  aria-label="Restaurar mensaje"
                  title="Restaurar"
                >
                  <MailOpen className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(recipient.id);
                  }}
                  className="flex size-7 items-center justify-center rounded-full hover:bg-muted"
                  aria-label="Eliminar mensaje"
                  title="Eliminar"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </>
          ) : null}

          {!isInboxRow && folder === "drafts" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditDraft(row as DraftMessageItem);
                }}
              >
                Editar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  void onDeleteDraft((row as DraftMessageItem).id);
                }}
              >
                Eliminar
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
