import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMessagesV2 } from "@/features/notifications/hooks/useMessagesV2";
import { useDrafts } from "@/features/notifications/hooks/useDrafts";
import { sendMessage, bulkMessages } from "@/features/notifications/services/messages.service";
import { createDraft, deleteDraft, sendDraft, updateDraft } from "@/features/notifications/services/drafts.service";
import type { DraftMessageItem, InboxItem, MessageFolder, SentMessageItem } from "@/features/notifications/types/message.types";
import MessageLoadingState from "@/features/notifications/components/feedback/MessageLoadingState";
import MessageErrorState from "@/features/notifications/components/feedback/MessageErrorState";
import NotificationMailToolbar from "@/features/notifications/components/mail/NotificationMailToolbar";
import NotificationMailList from "@/features/notifications/components/mail/NotificationMailList";
import NotificationComposeModal from "@/features/notifications/components/mail/NotificationComposeModal";
import { NOTIFICATION_WINDOW_EVENTS } from "@/features/notifications/constants/notification-events.constants";

type UiFolder = "inbox" | "sent" | "drafts" | "trash" | "starred";

const formatMessageDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString();
};

const getSenderLabel = (row: InboxItem | SentMessageItem | DraftMessageItem, currentFolder: UiFolder) => {
  if ("recipient" in row) {
    const message = row.message;
    if (!message) return "Sistema";
    if (message.senderType === "SYSTEM") return "Sistema";
    return "Usuario";
  }
  if (currentFolder === "sent") return "Yo";
  if (row.senderType === "SYSTEM") return "Sistema";
  return "Usuario";
};

export default function NotificationsPage() {
  const [folder, setFolder] = useState<UiFolder>("inbox");
  const [originModule, setOriginModule] = useState<string>("");
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);

  const messages = useMessagesV2({
    folder: (folder === "drafts" ? "inbox" : folder) as MessageFolder,
    originModule: originModule || undefined,
    q: debouncedQ || undefined,
    page,
    limit,
  });
  const drafts = useDrafts(folder === "drafts");

  const rows = useMemo(() => {
    if (folder === "drafts") return drafts.items;
    return messages.items;
  }, [folder, drafts.items, messages.items]) as Array<InboxItem | SentMessageItem | DraftMessageItem>;

  const inboxRows = rows.filter((row): row is InboxItem => "recipient" in row);
  const visibleRecipientIds = inboxRows.map((row) => row.recipient.id);
  const allVisibleSelected = visibleRecipientIds.length > 0 && visibleRecipientIds.every((id) => selectedRecipientIds.includes(id));
  const hasSelection = selectedRecipientIds.length > 0;

  const rangeStart = messages.total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, messages.total);
  const maxPage = Math.max(1, Math.ceil(messages.total / limit));
  const emitRefresh = () => window.dispatchEvent(new Event(NOTIFICATION_WINDOW_EVENTS.refresh));

  const resetCompose = () => {
    setRecipients("");
    setSubject("");
    setBody("");
    setEditingDraftId(null);
    setComposeOpen(false);
    setComposeMinimized(false);
    const next = new URLSearchParams(searchParams);
    next.delete("compose");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
    setSelectedRecipientIds([]);
  }, [folder, originModule, debouncedQ]);

  useEffect(() => {
    const folderParam = (searchParams.get("folder") ?? "").toLowerCase();
    const validFolders: UiFolder[] = ["inbox", "sent", "drafts", "trash", "starred"];
    if (validFolders.includes(folderParam as UiFolder) && folderParam !== folder) {
      setFolder(folderParam as UiFolder);
    }
  }, [folder, searchParams]);

  useEffect(() => {
    const originModuleParam = (searchParams.get("originModule") ?? "").trim();
    if (originModuleParam !== originModule) {
      setOriginModule(originModuleParam);
    }
  }, [originModule, searchParams]);

  useEffect(() => {
    if (searchParams.get("compose") === "1") {
      setComposeOpen(true);
      setComposeMinimized(false);
    }
  }, [searchParams]);

  const applyBulkAction = async (action: "MARK_AS_READ" | "MARK_AS_UNREAD" | "DELETE" | "RESTORE") => {
    if (!selectedRecipientIds.length) return;
    await bulkMessages({ messageRecipientIds: selectedRecipientIds, action });
    setSelectedRecipientIds([]);
    await messages.reload();
    emitRefresh();
  };

  const runRowAction = async (action: () => Promise<void>) => {
    try {
      await action();
      emitRefresh();
    } catch {
      // Mantiene la UX estable ante fallos puntuales de red.
    }
  };

  return (
    <div className="h-full">
      <div className="grid h-[calc(100vh-190px)] grid-cols-1 gap-4">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-background">
          {folder !== "drafts" ? (
            <NotificationMailToolbar
              allVisibleSelected={allVisibleSelected}
              hasSelection={hasSelection}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              total={messages.total}
              page={page}
              maxPage={maxPage}
              inTrash={folder === "trash"}
              onSelectToggle={() => {
                if (allVisibleSelected || hasSelection) setSelectedRecipientIds([]);
                else setSelectedRecipientIds(Array.from(new Set([...selectedRecipientIds, ...visibleRecipientIds])));
              }}
              onSelectAllVisible={() => setSelectedRecipientIds(Array.from(new Set([...selectedRecipientIds, ...visibleRecipientIds])))}
              onSelectNone={() => setSelectedRecipientIds([])}
              onSelectRead={() => {
                const readIds = inboxRows.filter((row) => Boolean(row.recipient.readAt)).map((row) => row.recipient.id);
                setSelectedRecipientIds(Array.from(new Set([...selectedRecipientIds, ...readIds])));
              }}
              onSelectUnread={() => {
                const unreadIds = inboxRows.filter((row) => !row.recipient.readAt).map((row) => row.recipient.id);
                setSelectedRecipientIds(Array.from(new Set([...selectedRecipientIds, ...unreadIds])));
              }}
              onBulkAction={(action) => void applyBulkAction(action)}
              onRefresh={() => {
                void messages.reload();
                emitRefresh();
              }}
              onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
              onNextPage={() => setPage((prev) => Math.min(maxPage, prev + 1))}
            />
          ) : null}

          {messages.loading && folder !== "drafts" ? (
            <MessageLoadingState />
          ) : messages.error && folder !== "drafts" ? (
            <MessageErrorState text={messages.error} onRetry={() => void messages.reload()} />
          ) : (
            <NotificationMailList
              rows={rows}
              folder={folder}
              selectedRecipientIds={selectedRecipientIds}
              onToggleSelect={(recipientId, checked) => {
                if (checked) setSelectedRecipientIds((prev) => Array.from(new Set([...prev, recipientId])));
                else setSelectedRecipientIds((prev) => prev.filter((id) => id !== recipientId));
              }}
              onToggleRead={(recipientId, value) => {
                void runRowAction(async () => {
                  await bulkMessages({
                    messageRecipientIds: [recipientId],
                    action: value ? "MARK_AS_UNREAD" : "MARK_AS_READ",
                  });
                  await messages.reload();
                });
              }}
              onToggleStar={(recipientId, value) => {
                void runRowAction(() => messages.starInboxRow(recipientId, value));
              }}
              onDelete={(recipientId) => {
                void runRowAction(() => messages.deleteInboxRow(recipientId));
              }}
              onRestore={(recipientId) => {
                void runRowAction(() => messages.restoreInboxRow(recipientId));
              }}
              onEditDraft={(draft) => {
                setEditingDraftId(draft.id);
                setRecipients(String(draft.bodyJson?.draftRecipients ?? ""));
                setSubject(draft.subject ?? "");
                setBody(draft.bodyHtml ?? "");
                setComposeOpen(true);
                setComposeMinimized(false);
              }}
              onDeleteDraft={async (draftId) => {
                await deleteDraft(draftId);
                await drafts.reload();
                emitRefresh();
              }}
              getSenderLabel={getSenderLabel}
              formatMessageDate={formatMessageDate}
            />
          )}
        </section>
      </div>

      <NotificationComposeModal
        open={composeOpen}
        minimized={composeMinimized}
        editingDraft={Boolean(editingDraftId)}
        recipients={recipients}
        subject={subject}
        body={body}
        error={composeError ?? undefined}
        onToggleMinimize={() => setComposeMinimized((prev) => !prev)}
        onClose={resetCompose}
        onRecipientsChange={setRecipients}
        onSubjectChange={setSubject}
        onBodyChange={setBody}
        onSend={async () => {
          if (!recipients.trim() || !subject.trim() || !body.trim()) {
            setComposeError("Completa destinatarios, asunto y cuerpo.");
            return;
          }
          setComposeError(null);
          try {
            if (editingDraftId) {
              await updateDraft(editingDraftId, { recipients, subject, bodyHtml: body });
              await sendDraft(editingDraftId, recipients);
            } else {
              await sendMessage({ recipients, subject, bodyHtml: body, originModule: originModule || "corporate" });
            }
            resetCompose();
            if (folder === "drafts") void drafts.reload();
            else void messages.reload();
            emitRefresh();
          } catch {
            setComposeError("No se pudo enviar el mensaje.");
          }
        }}
        onSaveDraft={async () => {
          setComposeError(null);
          try {
            if (editingDraftId) {
              await updateDraft(editingDraftId, { recipients, subject, bodyHtml: body });
            } else {
              await createDraft({
                recipients: recipients || undefined,
                subject: subject || undefined,
                bodyHtml: body || undefined,
                originModule: originModule || "corporate",
              });
            }
            resetCompose();
            if (folder === "drafts") void drafts.reload();
            emitRefresh();
          } catch {
            setComposeError("No se pudo guardar el borrador.");
          }
        }}
      />
    </div>
  );
}
