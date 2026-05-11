import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";
import { useMessagesV2 } from "@/features/notifications/hooks/useMessagesV2";
import { useDrafts } from "@/features/notifications/hooks/useDrafts";
import { useNotificationModules } from "@/features/notifications/hooks/useNotificationModules";
import { sendMessage } from "@/features/notifications/services/messages.service";
import { createDraft, deleteDraft, sendDraft, updateDraft } from "@/features/notifications/services/drafts.service";
import { bulkMessages } from "@/features/notifications/services/messages.service";
import { RoutesPaths } from "@/routes/config/routesPaths";
import type { DraftMessageItem, InboxItem, MessageFolder, SentMessageItem } from "@/features/notifications/types/message.types";
import MessageLoadingState from "@/features/notifications/components/feedback/MessageLoadingState";
import MessageEmptyState from "@/features/notifications/components/feedback/MessageEmptyState";
import MessageErrorState from "@/features/notifications/components/feedback/MessageErrorState";
import InlineMessageError from "@/features/notifications/components/feedback/InlineMessageError";

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
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [showMoreModules, setShowMoreModules] = useState(false);
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

  const { modules } = useNotificationModules();
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
  const rangeStart = messages.total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, messages.total);
  const maxPage = Math.max(1, Math.ceil(messages.total / limit));

  const resetCompose = () => {
    setRecipients("");
    setSubject("");
    setBody("");
    setEditingDraftId(null);
    setComposeOpen(false);
    setComposeMinimized(false);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const sidebarItems: Array<{ key: UiFolder; label: string }> = [
    { key: "inbox", label: "Recibidos" },
    { key: "starred", label: "Destacados" },
    { key: "sent", label: "Enviados" },
    { key: "drafts", label: "Borradores" },
  ];

  return (
    <div className="h-full p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4">
        <div>
          <h1 className="text-xl font-semibold">Mensajeria</h1>
          <p className="text-xs text-muted-foreground">Bandeja corporativa</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar en mensajes"
            className="w-[320px]"
          />
          <select
            value={originModule}
            onChange={(event) => setOriginModule(event.target.value)}
            className="h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Todos los modulos</option>
            {modules.map((moduleItem) => (
              <option key={moduleItem.key} value={moduleItem.key}>
                {moduleItem.label}
              </option>
            ))}
          </select>
          <Button type="button" onClick={() => setComposeOpen(true)}>
            Redactar
          </Button>
        </div>
      </div>

      <div className="grid h-[calc(100vh-190px)] grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border bg-sidebar p-3">
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFolder(item.key)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                  folder === item.key ? "bg-background font-medium text-foreground" : "text-muted-foreground hover:bg-background/70",
                )}
              >
                <span>{item.label}</span>
                {item.key === "drafts" ? <Badge variant="secondary">{drafts.items.length}</Badge> : null}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowMoreModules((prev) => !prev)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                "text-muted-foreground hover:bg-background/70",
              )}
            >
              <span>{showMoreModules ? "Ver menos" : "Ver mas"}</span>
            </button>
          </div>

          {showMoreModules ? (
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Modulos</p>
              <div className="space-y-1">
                {modules.map((moduleItem) => (
                  <button
                    key={moduleItem.key}
                    type="button"
                    onClick={() => setOriginModule((prev) => (prev === moduleItem.key ? "" : moduleItem.key))}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-xs",
                      originModule === moduleItem.key ? "bg-background text-foreground" : "text-muted-foreground hover:bg-background/70",
                    )}
                  >
                    {moduleItem.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 border-t pt-3">
            <button
              type="button"
              onClick={() => {
                setFolder("trash");
                setOriginModule("");
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                folder === "trash" ? "bg-background font-medium text-foreground" : "text-muted-foreground hover:bg-background/70",
              )}
            >
              <span>Papelera</span>
            </button>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col rounded-xl border bg-background">
          <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
            <span>{folder.toUpperCase()}</span>
            <span>
              {folder !== "drafts"
                ? `${rangeStart}-${rangeEnd} de ${messages.total}`
                : `${drafts.items.length} borradores`}
            </span>
          </div>
          {folder !== "drafts" ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={visibleRecipientIds.length > 0 && visibleRecipientIds.every((id) => selectedRecipientIds.includes(id))}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedRecipientIds(Array.from(new Set([...selectedRecipientIds, ...visibleRecipientIds])));
                    } else {
                      setSelectedRecipientIds(selectedRecipientIds.filter((id) => !visibleRecipientIds.includes(id)));
                    }
                  }}
                />
                <span className="text-xs text-muted-foreground">Seleccionados: {selectedRecipientIds.length}</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline">Seleccion</Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-44 p-2">
                    <div className="space-y-1">
                      <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => setSelectedRecipientIds(Array.from(new Set([...selectedRecipientIds, ...visibleRecipientIds])))}>
                        Todos
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setSelectedRecipientIds(Array.from(new Set([...selectedRecipientIds, ...inboxRows.filter((row) => Boolean(row.recipient.readAt)).map((row) => row.recipient.id)])))}
                      >
                        Leidos
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setSelectedRecipientIds(Array.from(new Set([...selectedRecipientIds, ...inboxRows.filter((row) => !row.recipient.readAt).map((row) => row.recipient.id)])))}
                      >
                        No leidos
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (!selectedRecipientIds.length) return;
                    await bulkMessages({ messageRecipientIds: selectedRecipientIds, action: "MARK_AS_READ" });
                    setSelectedRecipientIds([]);
                    await messages.reload();
                  }}
                >
                  Leer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (!selectedRecipientIds.length) return;
                    await bulkMessages({ messageRecipientIds: selectedRecipientIds, action: "MARK_AS_UNREAD" });
                    setSelectedRecipientIds([]);
                    await messages.reload();
                  }}
                >
                  No leido
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (!selectedRecipientIds.length) return;
                    await bulkMessages({
                      messageRecipientIds: selectedRecipientIds,
                      action: folder === "trash" ? "RESTORE" : "DELETE",
                    });
                    setSelectedRecipientIds([]);
                    await messages.reload();
                  }}
                >
                  {folder === "trash" ? "Restaurar" : "Eliminar"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {messages.loading && folder !== "drafts" ? (
              <MessageLoadingState />
            ) : messages.error && folder !== "drafts" ? (
              <MessageErrorState text={messages.error} onRetry={() => void messages.reload()} />
            ) : !rows.length ? (
              <MessageEmptyState text={folder === "drafts" ? "No tienes borradores." : "No tienes mensajes en esta bandeja."} />
            ) : (
              rows.map((row) => {
                const isInboxRow = "recipient" in row;
                const message = isInboxRow ? row.message : row;
                const recipient = isInboxRow ? row.recipient : null;
                const sender = getSenderLabel(row, folder);
                const title = message?.subject ?? "(Sin asunto)";
                const preview = message?.bodyText ?? "";
                const date = formatMessageDate(message?.sentAt ?? message?.updatedAt ?? message?.createdAt);
                const unread = Boolean(isInboxRow && recipient && !recipient.readAt);

                return (
                  <div
                    key={message?.id ?? recipient?.id}
                    className={cn(
                      "group grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-4 py-3 hover:bg-muted/40",
                      unread ? "bg-muted/20" : "",
                    )}
                  >
                    {isInboxRow && recipient ? (
                      <input
                        type="checkbox"
                        checked={selectedRecipientIds.includes(recipient.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedRecipientIds((prev) => Array.from(new Set([...prev, recipient.id])));
                          } else {
                            setSelectedRecipientIds((prev) => prev.filter((id) => id !== recipient.id));
                          }
                        }}
                      />
                    ) : (
                      <span />
                    )}
                    <div className="min-w-0">
                      <div className="grid grid-cols-[160px_1fr] items-center gap-3">
                        <p className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>{sender}</p>
                        <div className="min-w-0">
                          <Link
                            className={cn("block truncate text-sm", unread ? "font-semibold" : "font-medium")}
                            to={RoutesPaths.notificationDetail.replace(":id", (recipient?.id ?? message?.id ?? "").toString())}
                          >
                            {title}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">{preview}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="hidden md:inline-flex">{message?.originModule ?? "-"}</Badge>
                      <span className="text-xs text-muted-foreground group-hover:hidden">{date}</span>
                      {isInboxRow && recipient ? (
                        <div className="hidden items-center gap-1 group-hover:flex">
                          <Button type="button" variant="outline" onClick={() => void messages.starInboxRow(recipient.id, !recipient.starredAt)}>
                            {recipient.starredAt ? "Unstar" : "Star"}
                          </Button>
                          {folder === "trash" ? (
                            <Button type="button" variant="outline" onClick={() => void messages.restoreInboxRow(recipient.id)}>
                              Restaurar
                            </Button>
                          ) : (
                            <Button type="button" variant="outline" onClick={() => void messages.deleteInboxRow(recipient.id)}>
                              Eliminar
                            </Button>
                          )}
                        </div>
                      ) : null}
                      {!isInboxRow && folder === "drafts" ? (
                        <div className="hidden items-center gap-1 group-hover:flex">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingDraftId(message?.id ?? null);
                              setRecipients(String(message?.bodyJson?.draftRecipients ?? ""));
                              setSubject(message?.subject ?? "");
                              setBody(message?.bodyHtml ?? "");
                              setComposeOpen(true);
                              setComposeMinimized(false);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={async () => {
                              if (!message?.id) return;
                              await deleteDraft(message.id);
                              await drafts.reload();
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {folder !== "drafts" ? (
            <div className="flex items-center justify-end gap-2 border-t px-4 py-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
              >
                {"<"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Pagina {page} de {maxPage}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((prev) => Math.min(maxPage, prev + 1))}
                disabled={page >= maxPage}
              >
                {">"}
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      {composeOpen ? (
        <div className={cn("fixed bottom-4 right-4 z-50 w-[560px] rounded-xl border bg-background shadow-2xl", composeMinimized ? "h-12" : "")}>
          <div className="flex items-center justify-between rounded-t-xl border-b px-3 py-2">
            <p className="text-sm font-medium">{editingDraftId ? "Editar borrador" : "Mensaje nuevo"}</p>
            <div className="flex gap-1">
              <Button type="button" variant="outline" onClick={() => setComposeMinimized((prev) => !prev)}>
                _
              </Button>
              <Button type="button" variant="outline" onClick={resetCompose}>
                X
              </Button>
            </div>
          </div>
          {!composeMinimized ? (
            <div className="space-y-2 p-3">
              <Input value={recipients} onChange={(event) => setRecipients(event.target.value)} placeholder="Para" />
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Asunto" />
              <textarea
                className="min-h-44 w-full rounded-md border p-2 text-sm"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Escribe tu mensaje..."
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={async () => {
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
                      } catch {
                        setComposeError("No se pudo enviar el mensaje.");
                      }
                    }}
                  >
                    Enviar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
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
                      } catch {
                        setComposeError("No se pudo guardar el borrador.");
                      }
                    }}
                  >
                    Guardar borrador
                  </Button>
                </div>
              </div>
              <InlineMessageError text={composeError ?? undefined} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
