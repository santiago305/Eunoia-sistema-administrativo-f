import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import type { Mail } from "@/features/mail/types/mail-ui.types";
import MailToolbar from "@/features/mail/components/MailToolbar";
import MailList from "@/features/mail/components/MailList";
import MailDetail from "@/features/mail/components/MailDetail";
import NotificationComposeStack from "@/features/mail/components/ComposeStack";
import type { NotificationComposeDraft } from "@/features/mail/components/ComposeModal";
import { useMessagesV2 } from "@/features/mail/hooks/useMessagesV2";
import {
  bulkMessages,
  forwardMessage,
  getMessageDetail,
  listSearchHistory,
  permanentlyDeleteMessage,
  replyMessage,
  restoreMessage,
  saveSearchHistory,
  sendMessage,
  uploadAttachment,
  deleteAttachment as deleteRemoteAttachment,
} from "@/features/mail/services/messages.service";
import { createDraft, deleteDraft, updateDraft } from "@/features/mail/services/drafts.service";
import type { InboxItem, SentMessageItem } from "@/features/mail/types/message.types";
import { useMailLabels } from "@/features/mail/hooks/useMailLabels";
import { useMailModules } from "@/features/mail/hooks/useMailModules";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { Modal } from "@/shared/components/modales/Modal";

const createComposeId = () => `compose-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const MAX_COMPOSE_DRAFTS = 4;

type UiFolder = "inbox" | "starred" | "sent" | "drafts" | "trash" | "archived" | "snoozed";

type ComposePayload = {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  bodyJson?: Record<string, unknown> | null;
  editingDraftId?: string | null;
  mode?: "new" | "reply" | "forward";
  parentMessageId?: string | null;
};

type MailDetailData = {
  sender?: { id?: string; name?: string; email?: string } | null;
  recipients?: Array<{ id?: string; recipientEmail?: string; recipientType?: string }>;
  thread?: Array<{ id: string; subject: string; bodyHtml: string; createdAt: string; sentAt?: string | null }>;
} | null;

type BackendErrorPayload = {
  message?: string | string[];
};

const createComposeDraft = (payload?: ComposePayload): NotificationComposeDraft => ({
  id: createComposeId(),
  minimized: false,
  editingDraftId: payload?.editingDraftId ?? null,
  to: payload?.to ?? "",
  cc: payload?.cc ?? "",
  bcc: payload?.bcc ?? "",
  subject: payload?.subject ?? "",
  body: payload?.body ?? "",
  bodyJson: payload?.bodyJson ?? null,
  error: null,
  selectedLabelIds: [],
  attachmentIds: [],
  mode: payload?.mode ?? "new",
  parentMessageId: payload?.parentMessageId ?? null,
});

const ORIGIN_MODULE_TO_CATEGORY: Record<string, Mail["category"]> = {
  purchases: "compras",
  production: "produccion",
  warehouse: "almacen",
  catalog: "catalogo",
  supplies: "suministros",
  security: "seguridad",
  roles: "roles",
  providers: "sistema",
  corporate: "personal",
  system: "sistema",
};

const ORIGIN_MODULE_TO_LABEL: Record<string, string> = {
  purchases: "Compras",
  production: "Produccion",
  warehouse: "Almacen",
  catalog: "Catalogo",
  supplies: "Suministros",
  security: "Seguridad",
  roles: "Roles",
  providers: "Proveedores",
  corporate: "Corporativo",
  system: "Sistema",
};

const formatMailDate = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  const diffDays = Math.floor((+now - +d) / 86400_000);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return d.toLocaleDateString("es-PE", { weekday: "long" });
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

const formatFullDate = (iso: string): string =>
  new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const initialsOf = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const avatarColor = (seed: string): string => {
  const colors = ["oklch(0.6 0.18 25)", "oklch(0.6 0.18 60)", "oklch(0.55 0.18 140)", "oklch(0.55 0.18 200)", "oklch(0.55 0.18 260)", "oklch(0.55 0.18 320)", "oklch(0.6 0.18 10)"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % colors.length;
  return colors[h];
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const mapItemToMail = (item: InboxItem | SentMessageItem, folder: UiFolder): Mail | null => {
  if ("recipient" in item) {
    if (!item.message) return null;
    const senderName = item.sender?.name?.trim() || (item.message.senderType === "SYSTEM" ? "Sistema" : "Usuario");
    const senderEmail = item.sender?.email?.trim() || (item.message.senderType === "SYSTEM" ? "no-reply@eunoia.local" : "usuario@eunoia.local");
    const originModule = item.message.originModule ?? "system";
    return {
      id: item.message.id,
      messageId: item.message.id,
      recipientId: item.recipient.id,
      threadId: item.message.threadId,
      originModule,
      moduleLabel: ORIGIN_MODULE_TO_LABEL[originModule] ?? originModule,
      from: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ name: "Yo", email: "" }],
      subject: item.message.subject,
      body: item.message.bodyHtml,
      preview: item.message.bodyText?.slice(0, 110) ?? "",
      date: item.message.sentAt ?? item.message.createdAt,
      read: Boolean(item.recipient.readAt),
      starred: Boolean(item.recipient.starredAt),
      folder,
      category: ORIGIN_MODULE_TO_CATEGORY[originModule] ?? "sistema",
      attachments: [],
    };
  }

  const originModule = item.originModule ?? "corporate";
  return {
    id: item.id,
    messageId: item.id,
    threadId: item.threadId,
    originModule,
    moduleLabel: ORIGIN_MODULE_TO_LABEL[originModule] ?? originModule,
    from: { name: "Yo", email: "" },
    to: [{ name: "Destinatarios", email: "" }],
    subject: item.subject,
    body: item.bodyHtml,
    preview: item.bodyText?.slice(0, 110) ?? "",
    date: item.sentAt ?? item.createdAt,
    read: true,
    starred: false,
    folder,
    category: ORIGIN_MODULE_TO_CATEGORY[originModule] ?? "personal",
    attachments: [],
  };
};

export default function MailPage() {
  const navigate = useNavigate();
  const params = useParams<{ folder?: string; messageId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const labelId = (searchParams.get("labelId") ?? "").trim() || undefined;
  const originModule = (searchParams.get("originModule") ?? "").trim() || undefined;

  const [folder, setFolder] = useState<UiFolder>("inbox");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [activeMailId, setActiveMailId] = useState<string | null>(null);

  const [composeDrafts, setComposeDrafts] = useState<NotificationComposeDraft[]>([]);
  const [createLabelOpen, setCreateLabelOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#2563eb");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);
  const [customSnoozeAt, setCustomSnoozeAt] = useState("");
  const [activeMailDetail, setActiveMailDetail] = useState<MailDetailData>(null);
  const [searchInput, setSearchInput] = useState(q);
  const [searchHistoryItems, setSearchHistoryItems] = useState<Array<{ id: string; query: string }>>([]);
  const [searchHistoryOpen, setSearchHistoryOpen] = useState(false);
  const searchHistoryRef = useRef<HTMLDivElement | null>(null);

  const { can } = usePermissions();
  const canCreateLabel = can("notifications.labels.create");
  const { items: labels, createLabel, deleteLabel } = useMailLabels(true);
  const { modules: allowedModules } = useMailModules();

  const {
    items,
    total,
    reload,
    markInboxRowAsRead,
    markInboxRowAsUnread,
    starInboxRow,
    deleteInboxRow,
    archiveInboxRow,
    unarchiveInboxRow,
    snoozeInboxRow,
    unsnoozeInboxRow,
  } = useMessagesV2({
    folder,
    originModule,
    labelId,
    q,
    page,
    limit: pageSize,
  });

  const mails = useMemo(() => items.map((item) => mapItemToMail(item, folder)).filter((v): v is Mail => Boolean(v)), [items, folder]);

  const openCompose = useCallback((payload?: ComposePayload) => {
    setComposeDrafts((prev) => {
      const nextDraft = createComposeDraft(payload);

      return [
        ...prev.map((item) => ({ ...item, minimized: true })),
        nextDraft,
      ].slice(-MAX_COMPOSE_DRAFTS);
    });
  }, []);

  const onComposeAttachmentUploaded = useCallback((composeId: string, attachmentId: string) => {
    setComposeDrafts((prev) =>
      prev.map((item) =>
        item.id === composeId
          ? { ...item, attachmentIds: Array.from(new Set([...(item.attachmentIds ?? []), attachmentId])) }
          : item,
      ),
    );
  }, []);

  const onComposeAttachmentRemoved = useCallback((composeId: string, attachmentId: string) => {
    setComposeDrafts((prev) =>
      prev.map((item) =>
        item.id === composeId
          ? { ...item, attachmentIds: (item.attachmentIds ?? []).filter((id) => id !== attachmentId) }
          : item,
      ),
    );
  }, []);

  const updateComposeDraft = useCallback((composeId: string, patch: Partial<NotificationComposeDraft>) => {
    setComposeDrafts((prev) => prev.map((item) => (item.id === composeId ? { ...item, ...patch } : item)));
  }, []);

  const resolveComposeDraftId = useCallback(async (composeId: string) => {
    const compose = composeDrafts.find((item) => item.id === composeId);
    if (!compose) throw new Error("COMPOSE_NOT_FOUND");
    if (compose.editingDraftId) return compose.editingDraftId;
    const created = await createDraft({
      recipients: compose.to,
      subject: compose.subject,
      bodyHtml: compose.body,
      bodyJson: compose.bodyJson ?? undefined,
      originModule: "corporate",
    });
    const draftId = String(created?.id ?? "");
    if (!draftId) throw new Error("DRAFT_CREATE_FAILED");
    updateComposeDraft(composeId, { editingDraftId: draftId });
    return draftId;
  }, [composeDrafts, updateComposeDraft]);

  const removeComposeDraft = useCallback((composeId: string) => {
    setComposeDrafts((prev) => prev.filter((item) => item.id !== composeId));
  }, []);

  const discardComposeDraft = useCallback(async (composeId: string) => {
    const draft = composeDrafts.find((item) => item.id === composeId);
    removeComposeDraft(composeId);
    if (!draft?.editingDraftId) return;
    try {
      await deleteDraft(draft.editingDraftId);
    } catch {
      return;
    }
  }, [composeDrafts, removeComposeDraft]);

  const toggleComposeMinimize = useCallback((composeId: string) => {
    setComposeDrafts((prev) => {
      const target = prev.find((item) => item.id === composeId);
      const willExpand = Boolean(target?.minimized);
      return prev.map((item) => {
        if (item.id === composeId) return { ...item, minimized: !item.minimized };
        if (willExpand) return { ...item, minimized: true };
        return item;
      });
    });
  }, []);

  const toggleComposeLabel = useCallback((composeId: string, id: string) => {
    setComposeDrafts((prev) =>
      prev.map((item) => {
        if (item.id !== composeId) return item;
        const selectedLabelIds = item.selectedLabelIds.includes(id) ? item.selectedLabelIds.filter((x) => x !== id) : [...item.selectedLabelIds, id];
        return { ...item, selectedLabelIds };
      }),
    );
  }, []);

  const isComposeEmpty = (draft: NotificationComposeDraft) =>
    !draft.to.trim() && !draft.cc.trim() && !draft.bcc.trim() && !draft.subject.trim() && !stripHtml(draft.body);

  const closeComposeWithDraft = async (composeId: string) => {
    const draft = composeDrafts.find((item) => item.id === composeId);
    if (!draft) return;
    removeComposeDraft(composeId);
    if (isComposeEmpty(draft)) return;
    try {
      if (draft.editingDraftId) {
        await updateDraft(draft.editingDraftId, { recipients: draft.to, subject: draft.subject, bodyHtml: draft.body, bodyJson: draft.bodyJson ?? undefined });
      } else {
        await createDraft({ recipients: draft.to, subject: draft.subject, bodyHtml: draft.body, bodyJson: draft.bodyJson ?? undefined, originModule: "corporate" });
      }
    } catch {
      setLabelError("No se pudo guardar el borrador.");
    }
  };

  const parseRecipientList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const sendCompose = async (composeId: string, overrides?: Partial<Pick<NotificationComposeDraft, "to" | "cc" | "bcc" | "subject" | "body" | "selectedLabelIds" | "attachmentIds" | "bodyJson">>) => {
    const currentDraft = composeDrafts.find((item) => item.id === composeId);
    if (!currentDraft) return;
    const draft = { ...currentDraft, ...overrides };
    if (!draft.to.trim() || !draft.subject.trim() || !draft.body.trim()) {
      updateComposeDraft(composeId, { error: "Completa destinatarios, asunto y cuerpo." });
      return;
    }
    try {
      updateComposeDraft(composeId, { error: null });
      if (draft.mode === "reply" && draft.parentMessageId) {
        await replyMessage(draft.parentMessageId, {
          bodyHtml: draft.body,
          bodyJson: draft.bodyJson ?? null,
          to: parseRecipientList(draft.to),
          cc: parseRecipientList(draft.cc),
          bcc: parseRecipientList(draft.bcc),
          attachmentIds: draft.attachmentIds ?? [],
        });
      } else if (draft.mode === "forward" && draft.parentMessageId) {
        await forwardMessage(draft.parentMessageId, {
          bodyHtml: draft.body,
          bodyJson: draft.bodyJson ?? null,
          to: parseRecipientList(draft.to),
          cc: parseRecipientList(draft.cc),
          bcc: parseRecipientList(draft.bcc),
          attachmentIds: draft.attachmentIds ?? [],
        });
      } else {
        await sendMessage({
          to: parseRecipientList(draft.to),
          cc: parseRecipientList(draft.cc),
          bcc: parseRecipientList(draft.bcc),
          subject: draft.subject,
          bodyHtml: draft.body,
          bodyJson: draft.bodyJson ?? null,
          originModule: "corporate",
          labelIds: draft.selectedLabelIds,
          attachmentIds: draft.attachmentIds ?? [],
        });
      }
      removeComposeDraft(composeId);
      await reload();
      if (activeMailId) {
        const detail = await getMessageDetail(activeMailId);
        setActiveMailDetail(detail);
      }
    } catch (error: unknown) {
      const backendMessage = isAxiosError<BackendErrorPayload>(error)
        ? error.response?.data?.message
        : undefined;
      updateComposeDraft(composeId, { error: Array.isArray(backendMessage) ? backendMessage[0] : backendMessage || "No se pudo enviar el mensaje." });
    }
  };

  useEffect(() => {
    if (searchParams.get("compose") === "1") {
      openCompose();
      const next = new URLSearchParams(searchParams);
      next.delete("compose");
      setSearchParams(next, { replace: true });
    }

    if (searchParams.get("createLabel") === "1" && canCreateLabel) {
      setCreateLabelOpen(true);
    }

    const activeId = (params.messageId ?? searchParams.get("id") ?? "").trim();
    setActiveMailId(activeId || null);
  }, [canCreateLabel, openCompose, params.messageId, searchParams, setSearchParams]);

  useEffect(() => {
    const folderParam = (params.folder ?? searchParams.get("folder") ?? "").toLowerCase();
    const valid: UiFolder[] = ["inbox", "starred", "sent", "drafts", "trash", "archived", "snoozed"];
    if (valid.includes(folderParam as UiFolder)) setFolder(folderParam as UiFolder);
  }, [params.folder, searchParams]);

  useEffect(() => {
    if (!originModule) return;
    const isAllowed = allowedModules.some((moduleItem) => moduleItem.key === originModule);
    if (isAllowed) return;
    const next = new URLSearchParams(searchParams);
    next.delete("originModule");
    setSearchParams(next, { replace: true });
  }, [allowedModules, originModule, searchParams, setSearchParams]);

  useEffect(() => {
    const id = (searchParams.get("deleteLabel") ?? "").trim();
    if (!id || !canCreateLabel) return;
    void (async () => {
      try {
        await deleteLabel(id);
      } catch {
        setLabelError("No se pudo eliminar la etiqueta.");
      } finally {
        const next = new URLSearchParams(searchParams);
        next.delete("deleteLabel");
        setSearchParams(next, { replace: true });
      }
    })();
  }, [canCreateLabel, deleteLabel, searchParams, setSearchParams]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [folder, q, labelId, originModule]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await listSearchHistory();
        setSearchHistoryItems(history ?? []);
      } catch {
        setSearchHistoryItems([]);
      }
    };
    void loadHistory();
  }, []);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!searchHistoryRef.current) return;
      if (!searchHistoryRef.current.contains(event.target as Node)) {
        setSearchHistoryOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  useEffect(() => {
    if (!activeMailId) {
      setActiveMailDetail(null);
      return;
    }
    void (async () => {
      try {
        const detail = await getMessageDetail(activeMailId);
        setActiveMailDetail(detail);
      } catch {
        setActiveMailDetail(null);
      }
    })();
  }, [activeMailId]);

  const start = total === 0 ? 0 : (page - 1) * pageSize;
  const end = Math.min(start + mails.length, total);
  const pageMailIds = mails.map((m) => m.id);
  const pageReadIds = mails.filter((m) => m.read).map((m) => m.id);
  const pageUnreadIds = mails.filter((m) => !m.read).map((m) => m.id);
  const pageStarredIds = mails.filter((m) => m.starred).map((m) => m.id);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const activeMail = useMemo(() => mails.find((m) => m.id === activeMailId) ?? null, [mails, activeMailId]);

  const markRead = async (ids: string[], read: boolean) => {
    const selected = mails
      .filter((m) => ids.includes(m.id))
      .map((m) => m.recipientId ?? m.messageId ?? m.id);
    await Promise.all(selected.map((id) => (read ? markInboxRowAsRead(id) : markInboxRowAsUnread(id))));
    setSelectedIds(new Set());
    await reload();
  };

  const moveToTrash = async (ids: string[]) => {
    if (folder === "drafts") {
      const draftIds = mails
        .filter((m) => ids.includes(m.id))
        .map((m) => m.messageId ?? m.id);
      await Promise.all(draftIds.map((id) => deleteDraft(id)));
      setSelectedIds(new Set());
      await reload();
      return;
    }

    const selected = mails
      .filter((m) => ids.includes(m.id))
      .map((m) => m.recipientId ?? m.messageId ?? m.id);
    if (folder === "trash") {
      await Promise.all(selected.map((id) => permanentlyDeleteMessage(id)));
    } else {
      await Promise.all(selected.map((id) => deleteInboxRow(id)));
    }
    setSelectedIds(new Set());
    await reload();
  };

  const restoreFromTrash = async (ids: string[]) => {
    const selected = mails
      .filter((m) => ids.includes(m.id))
      .map((m) => m.recipientId ?? m.messageId ?? m.id);
    await Promise.all(selected.map((id) => restoreMessage(id)));
    setSelectedIds(new Set());
    await reload();
  };

  const archiveBulk = async (ids: string[], archive: boolean) => {
    const selected = mails
      .filter((m) => ids.includes(m.id))
      .map((m) => m.recipientId ?? m.messageId ?? m.id);
    if (!selected.length) return;
    await bulkMessages({
      messageRecipientIds: selected,
      action: archive ? "ARCHIVE" : "UNARCHIVE",
    });
    setSelectedIds(new Set());
    await reload();
  };

  const toggleStar = async (id: string) => {
    const target = mails.find((m) => m.id === id);
    if (!target) return;
    await starInboxRow(target.recipientId ?? target.messageId ?? target.id, !target.starred);
    await reload();
  };

  const toggleArchive = async (id: string) => {
    const target = mails.find((m) => m.id === id);
    if (!target) return;
    const actionId = target.recipientId ?? target.messageId ?? target.id;
    if (folder === "archived") await unarchiveInboxRow(actionId);
    else await archiveInboxRow(actionId);
  };

  const openSnooze = (id: string) => {
    setSnoozeTargetId(id);
    setCustomSnoozeAt("");
  };

  const applySnooze = async (iso: string) => {
    if (!snoozeTargetId) return;
    const target = mails.find((m) => m.id === snoozeTargetId);
    if (!target) return;
    await snoozeInboxRow(target.recipientId ?? target.messageId ?? target.id, iso);
    setSnoozeTargetId(null);
  };

  const unsnooze = async (id: string) => {
    const target = mails.find((m) => m.id === id);
    if (!target) return;
    await unsnoozeInboxRow(target.recipientId ?? target.messageId ?? target.id);
  };

  const createNewLabel = async () => {
    if (!newLabelName.trim()) {
      setLabelError("El nombre de etiqueta es obligatorio.");
      return;
    }

    try {
      setLabelError(null);
      await createLabel(newLabelName.trim(), newLabelColor);
      setNewLabelName("");
      setNewLabelColor("#2563eb");
      setCreateLabelOpen(false);
      const next = new URLSearchParams(searchParams);
      next.delete("createLabel");
      setSearchParams(next, { replace: true });
    } catch {
      setLabelError("No se pudo crear la etiqueta. Intenta nuevamente.");
    }
  };

  const applySearch = async (value: string) => {
    const term = value.trim();
    const next = new URLSearchParams(searchParams);
    if (term) {
      next.set("q", term);
      try {
        const updated = await saveSearchHistory(term);
        setSearchHistoryItems(updated ?? []);
      } catch {
        return;
      }
    } else {
      next.delete("q");
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="h-full">
      <div className="grid h-full grid-cols-1 gap-4">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-background">
          <main className="flex flex-1 flex-col overflow-hidden bg-background">
            {activeMailId ? (
              <MailDetail
                mail={activeMail}
                currentUserEmail={""}
                onBack={() => {
                  navigate(`/email/${folder}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, { replace: true });
                  setActiveMailId(null);
                }}
                onSetRead={(id, read) => void markRead([id], read)}
                onDelete={(id) => void moveToTrash([id])}
                onRestore={(id) => void restoreFromTrash([id])}
                onToggleStar={(id) => void toggleStar(id)}
                detailData={activeMailDetail}
                onComposePrefill={(payload) =>
                  openCompose({
                    to: payload.to,
                    subject: payload.subject,
                    body: payload.body,
                    mode: payload.mode,
                    parentMessageId: payload.parentMessageId,
                  })
                }
                formatFullDate={formatFullDate}
                initialsOf={initialsOf}
                avatarColor={avatarColor}
              />
            ) : (
              <>
                <div className="border-b border-border px-4 py-2">
                  <div className="relative" ref={searchHistoryRef}>
                    <input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onFocus={() => setSearchHistoryOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void applySearch(searchInput);
                          setSearchHistoryOpen(false);
                        }
                      }}
                      placeholder="Buscar por correo, asunto, cuerpo, adjunto..."
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                    />
                    {searchHistoryOpen && searchHistoryItems.length > 0 ? (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-background p-1 shadow-sm">
                        {searchHistoryItems.map((item) => (
                          <button
                            key={item.id}
                            className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setSearchInput(item.query);
                              void applySearch(item.query);
                              setSearchHistoryOpen(false);
                            }}
                          >
                            {item.query}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <MailToolbar
                  total={total}
                  start={start}
                  end={end}
                  page={page - 1}
                  pageCount={pageCount}
                  pageMailIds={pageMailIds}
                  pageReadIds={pageReadIds}
                  pageUnreadIds={pageUnreadIds}
                  pageStarredIds={pageStarredIds}
                  selectedIds={selectedIds}
                  folder={folder}
                  onSelectVisible={(ids) => setSelectedIds(new Set(ids))}
                  onClearSelection={() => setSelectedIds(new Set())}
                  onSetReadBulk={(ids, read) => void markRead(ids, read)}
                  onDeleteBulk={(ids) => void moveToTrash(ids)}
                  onRestoreBulk={(ids) => void restoreFromTrash(ids)}
                  onArchiveBulk={(ids, archive) => void archiveBulk(ids, archive)}
                  onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
                  onNextPage={() => setPage((p) => (p < pageCount ? p + 1 : p))}
                  onRefresh={() => void reload()}
                />

                <MailList
                  mails={mails}
                  selectedIds={selectedIds}
                  onOpen={(id) => {
                    navigate(`/email/${folder}/${id}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, { replace: true });
                    setActiveMailId(id);
                  }}
                  onToggleSelect={(id) =>
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                  onToggleStar={(id) => void toggleStar(id)}
                  onSetRead={(id, read) => void markRead([id], read)}
                  onDelete={(id) => void moveToTrash([id])}
                  onRestore={(id) => void restoreFromTrash([id])}
                  onArchive={(id) => void toggleArchive(id)}
                  onSnooze={(id) => {
                    if (folder === "snoozed") {
                      void unsnooze(id);
                      return;
                    }
                    openSnooze(id);
                  }}
                  formatMailDate={formatMailDate}
                  initialsOf={initialsOf}
                  avatarColor={avatarColor}
                />
              </>
            )}
          </main>
        </section>
      </div>

      <NotificationComposeStack
        drafts={composeDrafts}
        labels={labels.filter((item) => item.type === "CUSTOM" || item.type === "MODULE")}
        onToggleMinimize={toggleComposeMinimize}
      onClose={(composeId) => {
          void closeComposeWithDraft(composeId);
        }}
        onToChange={(composeId, value) => updateComposeDraft(composeId, { to: value })}
        onCcChange={(composeId, value) => updateComposeDraft(composeId, { cc: value })}
        onBccChange={(composeId, value) => updateComposeDraft(composeId, { bcc: value })}
        onSubjectChange={(composeId, value) => updateComposeDraft(composeId, { subject: value })}
        onBodyChange={(composeId, value, bodyJson) => updateComposeDraft(composeId, { body: value, bodyJson })}
        onToggleLabel={toggleComposeLabel}
        onResolveDraftId={resolveComposeDraftId}
        onAttachmentUploaded={onComposeAttachmentUploaded}
        onAttachmentRemoved={onComposeAttachmentRemoved}
        onUploadAttachment={async ({ file, draftId }) => uploadAttachment({ file, draftId })}
        onDeleteAttachment={async (attachmentId) => {
          await deleteRemoteAttachment(attachmentId);
        }}
        onDiscard={(composeId) => {
          void discardComposeDraft(composeId);
        }}
        onSend={sendCompose}
      />

      <Modal
        open={Boolean(snoozeTargetId)}
        onClose={() => setSnoozeTargetId(null)}
        title="Posponer mensaje"
        className="w-full max-w-sm"
        bodyClassName="space-y-2 px-0"
      >
        <div className="grid gap-2">
          <SystemButton type="button" variant="outline" size="sm" onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            d.setHours(8, 0, 0, 0);
            void applySnooze(d.toISOString());
          }}>
            Mañana 8:00
          </SystemButton>
          <SystemButton type="button" variant="outline" size="sm" onClick={() => {
            const d = new Date();
            const day = d.getDay();
            const add = day === 0 ? 6 : 6 - day;
            d.setDate(d.getDate() + add);
            d.setHours(8, 0, 0, 0);
            void applySnooze(d.toISOString());
          }}>
            Fin de semana
          </SystemButton>
          <SystemButton type="button" variant="outline" size="sm" onClick={() => {
            const d = new Date();
            d.setMonth(d.getMonth() + 1, 0);
            d.setHours(8, 0, 0, 0);
            void applySnooze(d.toISOString());
          }}>
            Fin de mes
          </SystemButton>
          <input
            type="datetime-local"
            value={customSnoozeAt}
            onChange={(e) => setCustomSnoozeAt(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <SystemButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              if (!customSnoozeAt) return;
              void applySnooze(new Date(customSnoozeAt).toISOString());
            }}
          >
            Elegir fecha y hora
          </SystemButton>
        </div>
      </Modal>

      <Modal
        open={createLabelOpen}
        onClose={() => {
          setCreateLabelOpen(false);
          const next = new URLSearchParams(searchParams);
          next.delete("createLabel");
          setSearchParams(next, { replace: true });
        }}
        title="Crear etiqueta"
        className="w-full max-w-xs"
        bodyClassName="space-y-3 px-0"
        footer={
          <div className="flex justify-end gap-2">
            <SystemButton
              type="button"
              variant="outline"
              size="sm"
              className="rounded-sm px-3 py-1.5 text-sm"
              onClick={() => {
                setCreateLabelOpen(false);
                const next = new URLSearchParams(searchParams);
                next.delete("createLabel");
                setSearchParams(next, { replace: true });
              }}
            >
              Cancelar
            </SystemButton>

            <SystemButton type="button" variant="primary" size="sm" className="rounded-sm px-3 py-1.5 text-sm" onClick={() => void createNewLabel()}>
              Crear
            </SystemButton>
          </div>
        }
      >
        <FloatingInput label="Nombre de etiqueta" name="new-label-name" value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} />

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Color</span>
          <input type="color" value={newLabelColor} onChange={(e) => setNewLabelColor(e.target.value)} />
        </div>

        {labelError ? <p className="text-xs text-destructive">{labelError}</p> : null}
      </Modal>
    </div>
  );
}



