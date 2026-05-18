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
  forwardMessage,
  getMessageDetail,
  assignLabelToMessage,
  removeLabelFromMessage,
  permanentlyDeleteMessage,
  replyMessage,
  sendMessage,
  uploadAttachment,
  deleteAttachment as deleteRemoteAttachment,
} from "@/features/mail/services/messages.service";
import { createDraft, deleteDraft, sendDraft, updateDraft } from "@/features/mail/services/drafts.service";
import type { InboxItem, SentMessageItem } from "@/features/mail/types/message.types";
import { useSileoMessageEvents } from "@/features/mail/hooks/useSileoMessageEvents";
import { useMailDashboardContext } from "@/features/mail/context/MailDashboardProvider";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { Modal } from "@/shared/components/modales/Modal";

const createComposeId = () => `compose-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const MAX_COMPOSE_DRAFTS = 4;
const COMPOSE_AUTOSAVE_MS = 10_000;

type UiFolder = "inbox" | "starred" | "sent" | "drafts" | "trash" | "archived" | "snoozed" | "all";

type ComposePayload = {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  bodyJson?: Record<string, unknown> | null;
  attachmentIds?: string[];
  editingDraftId?: string | null;
  mode?: "new" | "reply" | "forward";
  parentMessageId?: string | null;
};

type MailDetailData = {
  sender?: { id?: string; name?: string; email?: string } | null;
  recipients?: Array<{ id?: string; recipientEmail?: string; recipientType?: string }>;
  thread?: Array<{ id: string; subject: string; bodyHtml: string; createdAt: string; sentAt?: string | null }>;
  labels?: Array<{ id?: string; labelId?: string }>;
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
  attachmentIds: payload?.attachmentIds ?? [],
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
const extractDraftRecipients = (bodyJson: Record<string, unknown> | null | undefined): string => {
  const raw = bodyJson && typeof bodyJson === "object" ? bodyJson.draftRecipients : "";
  return typeof raw === "string" ? raw : "";
};
const extractDraftAttachmentIds = (bodyJson: Record<string, unknown> | null | undefined): string[] => {
  const raw = bodyJson && typeof bodyJson === "object" ? bodyJson.draftAttachmentIds : [];
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};
const buildDraftBodyJson = (
  draft: Pick<NotificationComposeDraft, "bodyJson" | "to" | "attachmentIds">,
): Record<string, unknown> => ({
  ...(draft.bodyJson ?? {}),
  draftRecipients: draft.to,
  draftAttachmentIds: draft.attachmentIds ?? [],
});
const serializeComposeDraft = (draft: NotificationComposeDraft) =>
  JSON.stringify({
    to: draft.to.trim(),
    cc: draft.cc.trim(),
    bcc: draft.bcc.trim(),
    subject: draft.subject.trim(),
    body: stripHtml(draft.body),
    bodyJson: draft.bodyJson ?? null,
    labels: [...draft.selectedLabelIds].sort(),
    attachments: [...(draft.attachmentIds ?? [])].sort(),
    mode: draft.mode,
    parentMessageId: draft.parentMessageId ?? null,
  });

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

  const [folder, setFolder] = useState<UiFolder>("inbox");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [activeMailId, setActiveMailId] = useState<string | null>(null);

  const [composeDrafts, setComposeDrafts] = useState<NotificationComposeDraft[]>([]);
  const [savingComposeIds, setSavingComposeIds] = useState<Set<string>>(new Set());
  const [sendingComposeIds, setSendingComposeIds] = useState<Set<string>>(new Set());
  const [discardingComposeIds, setDiscardingComposeIds] = useState<Set<string>>(new Set());
  const [createLabelOpen, setCreateLabelOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#2563eb");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);
  const [customSnoozeAt, setCustomSnoozeAt] = useState("");
  const [activeMailDetail, setActiveMailDetail] = useState<MailDetailData>(null);
  const [messageLabelIdsByMessage, setMessageLabelIdsByMessage] = useState<Record<string, string[]>>({});
  const [localStarredById, setLocalStarredById] = useState<Record<string, boolean>>({});
  const composeDraftsRef = useRef<NotificationComposeDraft[]>([]);
  const persistedSignaturesRef = useRef<Map<string, string>>(new Map());

  const { can } = usePermissions();
  const canCreateLabel = can("notifications.labels.create");
  const { labels, createLabel, deleteLabel, applyCountsDelta, applyUnreadByLabelDelta } = useMailDashboardContext();

  const {
    items,
    total,
    loading,
    error,
    reload,
    markInboxRowAsRead,
    markInboxRowAsUnread,
    starInboxRow,
    deleteInboxRow,
    restoreInboxRow,
    archiveInboxRow,
    unarchiveInboxRow,
    snoozeInboxRow,
    unsnoozeInboxRow,
    removeRecipientRowLocally,
    removeMessageRowLocally,
  } = useMessagesV2({
    folder,
    labelId,
    q,
    page,
    limit: pageSize,
  });

  useSileoMessageEvents({
    onRefreshMessages: reload,
  });

  useEffect(() => {
    setLocalStarredById({});
  }, [items]);

  const mails = useMemo(
    () =>
      items
        .map((item) => mapItemToMail(item, folder))
        .filter((v): v is Mail => Boolean(v))
        .map((mail) => {
          const actionId = mail.recipientId ?? mail.messageId ?? mail.id;
          const localStarred = localStarredById[mail.id] ?? localStarredById[actionId];

          if (typeof localStarred !== "boolean") return mail;

          return {
            ...mail,
            starred: localStarred,
          };
        }),
    [folder, items, localStarredById],
  );

  useEffect(() => {
    console.log("[mail:view] render-metrics", {
      view: folder,
      page,
      pageSize,
      total,
      items: items.length,
      mails: mails.length,
    });
  }, [folder, page, pageSize, total, items.length, mails.length]);

  useEffect(() => {
    composeDraftsRef.current = composeDrafts;
    const aliveIds = new Set(composeDrafts.map((item) => item.id));
    Array.from(persistedSignaturesRef.current.keys()).forEach((id) => {
      if (!aliveIds.has(id)) persistedSignaturesRef.current.delete(id);
    });
  }, [composeDrafts]);

  const openCompose = useCallback((payload?: ComposePayload) => {
    if (composeDraftsRef.current.length >= MAX_COMPOSE_DRAFTS) {
      setLabelError(`Solo se permiten ${MAX_COMPOSE_DRAFTS} ventanas de redactar abiertas.`);
      return;
    }
    setComposeDrafts((prev) => {
      const nextDraft = createComposeDraft(payload);
      const next = [
        ...prev.map((item) => ({ ...item, minimized: true })),
        nextDraft,
      ];
      persistedSignaturesRef.current.set(nextDraft.id, serializeComposeDraft(nextDraft));
      return next;
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

  const persistComposeDraft = useCallback(async (composeId: string) => {
    const draft = composeDraftsRef.current.find((item) => item.id === composeId);
    if (!draft) return;
    if (!draft.to.trim() && !draft.cc.trim() && !draft.bcc.trim() && !draft.subject.trim() && !stripHtml(draft.body)) return;
    const signature = serializeComposeDraft(draft);
    const lastSignature = persistedSignaturesRef.current.get(composeId);
    if (signature === lastSignature) return;

    setSavingComposeIds((prev) => new Set(prev).add(composeId));
    try {
      if (draft.editingDraftId) {
        await updateDraft(draft.editingDraftId, {
          recipients: draft.to,
          subject: draft.subject,
          bodyHtml: draft.body,
          bodyJson: buildDraftBodyJson(draft),
        });
      } else {
        const created = await createDraft({
          recipients: draft.to,
          subject: draft.subject,
          bodyHtml: draft.body,
          bodyJson: buildDraftBodyJson(draft),
          originModule: "corporate",
        });
        const draftId = String(created?.id ?? "");
        if (draftId) updateComposeDraft(composeId, { editingDraftId: draftId });
      }
      persistedSignaturesRef.current.set(composeId, signature);
    } finally {
      setSavingComposeIds((prev) => {
        const next = new Set(prev);
        next.delete(composeId);
        return next;
      });
    }
  }, [updateComposeDraft]);

  const resolveComposeDraftId = useCallback(async (composeId: string) => {
    const compose = composeDraftsRef.current.find((item) => item.id === composeId);
    if (!compose) throw new Error("COMPOSE_NOT_FOUND");
    if (compose.editingDraftId) return compose.editingDraftId;
    setSavingComposeIds((prev) => new Set(prev).add(composeId));
    try {
      const created = await createDraft({
        recipients: compose.to || compose.cc || compose.bcc || "",
        subject: compose.subject,
        bodyHtml: compose.body,
        bodyJson: buildDraftBodyJson(compose),
        originModule: "corporate",
      });
      const draftId = String(created?.id ?? "");
      if (!draftId) throw new Error("DRAFT_CREATE_FAILED");
      updateComposeDraft(composeId, { editingDraftId: draftId });
      persistedSignaturesRef.current.set(composeId, serializeComposeDraft({ ...compose, editingDraftId: draftId }));
      return draftId;
    } finally {
      setSavingComposeIds((prev) => {
        const next = new Set(prev);
        next.delete(composeId);
        return next;
      });
    }
  }, [updateComposeDraft]);

  const removeComposeDraft = useCallback((composeId: string) => {
    setComposeDrafts((prev) => prev.filter((item) => item.id !== composeId));
    persistedSignaturesRef.current.delete(composeId);
  }, []);

  const discardComposeDraft = useCallback(async (composeId: string) => {
    const draft = composeDraftsRef.current.find((item) => item.id === composeId);
    if (!draft) return;
    if (sendingComposeIds.has(composeId) || savingComposeIds.has(composeId)) return;
    setDiscardingComposeIds((prev) => new Set(prev).add(composeId));
    try {
      removeComposeDraft(composeId);
      if (!draft.editingDraftId) return;
      await deleteDraft(draft.editingDraftId);
    } catch {
      return;
    } finally {
      setDiscardingComposeIds((prev) => {
        const next = new Set(prev);
        next.delete(composeId);
        return next;
      });
    }
  }, [removeComposeDraft, savingComposeIds, sendingComposeIds]);

  const toggleComposeMinimize = useCallback((composeId: string) => {
    setComposeDrafts((prev) => {
      const target = prev.find((item) => item.id === composeId);
      if (!target) return prev;
      if (sendingComposeIds.has(composeId) || savingComposeIds.has(composeId) || discardingComposeIds.has(composeId)) return prev;
      const willExpand = Boolean(target?.minimized);
      if (!willExpand) {
        void persistComposeDraft(composeId);
      }
      return prev.map((item) => {
        if (item.id === composeId) return { ...item, minimized: !item.minimized };
        if (willExpand) return { ...item, minimized: true };
        return item;
      });
    });
  }, [discardingComposeIds, persistComposeDraft, savingComposeIds, sendingComposeIds]);

  const toggleComposeLabel = useCallback((composeId: string, id: string) => {
    setComposeDrafts((prev) =>
      prev.map((item) => {
        if (item.id !== composeId) return item;
        const selectedLabelIds = item.selectedLabelIds.includes(id) ? item.selectedLabelIds.filter((x) => x !== id) : [...item.selectedLabelIds, id];
        return { ...item, selectedLabelIds };
      }),
    );
  }, []);

  const closeComposeWithDraft = async (composeId: string) => {
    const draft = composeDraftsRef.current.find((item) => item.id === composeId);
    if (!draft) return;
    if (sendingComposeIds.has(composeId) || discardingComposeIds.has(composeId)) return;
    if (savingComposeIds.has(composeId)) return;
    try {
      await persistComposeDraft(composeId);
    } catch {
      setLabelError("No se pudo guardar el borrador.");
      return;
    }
    removeComposeDraft(composeId);
  };

  const parseRecipientList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const sendCompose = async (composeId: string, overrides?: Partial<Pick<NotificationComposeDraft, "to" | "cc" | "bcc" | "subject" | "body" | "selectedLabelIds" | "attachmentIds" | "bodyJson">>) => {
    if (sendingComposeIds.has(composeId) || savingComposeIds.has(composeId) || discardingComposeIds.has(composeId)) return;
    const currentDraft = composeDraftsRef.current.find((item) => item.id === composeId);
    if (!currentDraft) return;
    const draft = { ...currentDraft, ...overrides };
    if (!draft.to.trim() || !draft.subject.trim() || !draft.body.trim()) {
      updateComposeDraft(composeId, { error: "Completa destinatarios, asunto y cuerpo." });
      return;
    }
    try {
      setSendingComposeIds((prev) => new Set(prev).add(composeId));
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
      } else if (draft.editingDraftId && draft.mode === "new") {
        await updateDraft(draft.editingDraftId, {
          recipients: draft.to,
          subject: draft.subject,
          bodyHtml: draft.body,
          bodyJson: buildDraftBodyJson(draft),
        });
        await sendDraft(draft.editingDraftId, {
          recipients: draft.to,
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
      persistedSignaturesRef.current.delete(composeId);
    } catch (error: unknown) {
      const backendMessage = isAxiosError<BackendErrorPayload>(error)
        ? error.response?.data?.message
        : undefined;
      updateComposeDraft(composeId, { error: Array.isArray(backendMessage) ? backendMessage[0] : backendMessage || "No se pudo enviar el mensaje." });
    } finally {
      setSendingComposeIds((prev) => {
        const next = new Set(prev);
        next.delete(composeId);
        return next;
      });
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
    const folderParam = (params.folder ?? "").toLowerCase();
    const valid: UiFolder[] = ["inbox", "starred", "sent", "drafts", "trash", "archived", "snoozed", "all"];
    if (valid.includes(folderParam as UiFolder)) setFolder(folderParam as UiFolder);
    else setFolder("inbox");
  }, [params.folder]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const drafts = composeDraftsRef.current;
      drafts.forEach((draft) => {
        if (draft.minimized) return;
        if (sendingComposeIds.has(draft.id) || savingComposeIds.has(draft.id) || discardingComposeIds.has(draft.id)) return;
        void persistComposeDraft(draft.id);
      });
    }, COMPOSE_AUTOSAVE_MS);
    return () => window.clearInterval(id);
  }, [discardingComposeIds, persistComposeDraft, savingComposeIds, sendingComposeIds]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      const hasDirtyDraft = composeDraftsRef.current.some((draft) => {
        const current = serializeComposeDraft(draft);
        const persisted = persistedSignaturesRef.current.get(draft.id);
        return current !== persisted;
      });
      if (!hasDirtyDraft) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

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
  }, [folder, q, labelId]);

  useEffect(() => {
    if (!activeMailId) {
      setActiveMailDetail(null);
      return;
    }
    void (async () => {
      try {
        const detail = await getMessageDetail(activeMailId);
        setActiveMailDetail(detail);
        const rawLabels = Array.isArray((detail as { labels?: unknown })?.labels)
          ? ((detail as { labels?: Array<{ id?: string; labelId?: string }> }).labels ?? [])
          : [];
        const extracted = rawLabels
          .map((item) => item?.id ?? item?.labelId)
          .filter((id): id is string => Boolean(id));
        setMessageLabelIdsByMessage((prev) => ({ ...prev, [activeMailId]: extracted }));
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

  const unreadBucketByFolder = (value: UiFolder): "inbox" | "trash" | "archived" | "snoozed" | null => {
    if (value === "inbox") return "inbox";
    if (value === "trash") return "trash";
    if (value === "archived") return "archived";
    if (value === "snoozed") return "snoozed";
    return null;
  };
  const countsLabelAware = folder === "inbox" || folder === "starred" || folder === "all";
  const rawLabelIdsByMessageId = useMemo(() => {
    const map = new Map<string, string[]>();
    items.forEach((item) => {
      if (!("recipient" in item)) return;
      const messageId = item.message?.id ?? item.recipient.messageId;
      if (!messageId) return;
      const customLabelIds = (item.labels ?? [])
        .filter((label) => label?.type === "CUSTOM")
        .map((label) => label.id)
        .filter(Boolean);
      map.set(messageId, customLabelIds);
    });
    Object.entries(messageLabelIdsByMessage).forEach(([messageId, labelIds]) => {
      if (!map.has(messageId)) map.set(messageId, labelIds);
    });
    return map;
  }, [items, messageLabelIdsByMessage]);
  const getMessageLabelIds = (mail: Mail) => rawLabelIdsByMessageId.get(mail.messageId ?? mail.id) ?? [];

  const markRead = async (ids: string[], read: boolean) => {
    const selectedMails = mails.filter((m) => ids.includes(m.id));
    const selected = selectedMails
      .map((m) => m.recipientId ?? m.messageId ?? m.id);
    await Promise.all(selected.map((id) => (read ? markInboxRowAsRead(id) : markInboxRowAsUnread(id))));
    const unreadBucket = unreadBucketByFolder(folder);
    let unreadDelta = 0;
    let starredDelta = 0;
    const labelDeltaById: Record<string, number> = {};

    selectedMails.forEach((mail) => {
      const wasUnread = !mail.read;
      const changedToRead = read && wasUnread;
      const changedToUnread = !read && !wasUnread;
      if (!changedToRead && !changedToUnread) return;

      const direction = changedToRead ? -1 : 1;
      unreadDelta += direction;
      if (mail.starred) starredDelta += direction;
      if (countsLabelAware) {
        getMessageLabelIds(mail).forEach((labelId) => {
          labelDeltaById[labelId] = Number(labelDeltaById[labelId] ?? 0) + direction;
        });
      }
    });

    const deltaPayload: Partial<{ inbox: number; trash: number; archived: number; snoozed: number; starred: number }> = {
      starred: starredDelta,
    };
    if (unreadBucket) {
      deltaPayload[unreadBucket] = unreadDelta;
    }
    applyCountsDelta({
      ...deltaPayload,
      labelUnreadById: countsLabelAware ? labelDeltaById : undefined,
    });
    setSelectedIds(new Set());
  };

  const moveToTrash = async (ids: string[]) => {
    if (folder === "drafts") {
      const selectedDraftIds = mails
        .filter((m) => ids.includes(m.id))
        .map((m) => m.messageId ?? m.id);
      await Promise.all(selectedDraftIds.map((id) => deleteDraft(id)));
      selectedDraftIds.forEach((id) => removeMessageRowLocally(id));
      applyCountsDelta({ drafts: -selectedDraftIds.length });
      setSelectedIds(new Set());
      return;
    }

    const selectedMails = mails.filter((m) => ids.includes(m.id));
    const selected = selectedMails
      .map((m) => m.recipientId ?? m.messageId ?? m.id);
    if (folder === "trash") {
      await Promise.all(selected.map((id) => permanentlyDeleteMessage(id)));
      selected.forEach((id) => removeRecipientRowLocally(id));
      const unreadInTrash = selectedMails.filter((mail) => !mail.read).length;
      applyCountsDelta({ trash: -unreadInTrash });
    } else {
      await Promise.all(selected.map((id) => deleteInboxRow(id)));
      const unreadMoved = selectedMails.filter((mail) => !mail.read);
      const unreadCount = unreadMoved.length;
      const unreadBucket = unreadBucketByFolder(folder);
      const labelDeltaById: Record<string, number> = {};
      let starredDelta = 0;
      unreadMoved.forEach((mail) => {
        if (mail.starred) starredDelta -= 1;
        if (countsLabelAware) {
          getMessageLabelIds(mail).forEach((labelId) => {
            labelDeltaById[labelId] = Number(labelDeltaById[labelId] ?? 0) - 1;
          });
        }
      });
      const deltaPayload: Partial<{ inbox: number; trash: number; archived: number; snoozed: number; starred: number }> = {
        trash: unreadCount,
        starred: starredDelta,
      };
      if (unreadBucket) deltaPayload[unreadBucket] = -unreadCount;
      applyCountsDelta({
        ...deltaPayload,
        labelUnreadById: countsLabelAware ? labelDeltaById : undefined,
      });
    }
    setSelectedIds(new Set());
  };

  const restoreFromTrash = async (ids: string[]) => {
    const selectedMails = mails.filter((m) => ids.includes(m.id));
    const selected = selectedMails
      .map((m) => m.recipientId ?? m.messageId ?? m.id);
    await Promise.all(selected.map((id) => restoreInboxRow(id)));
    const unreadRestored = selectedMails.filter((mail) => !mail.read);
    const labelDeltaById: Record<string, number> = {};
    let starredDelta = 0;
    unreadRestored.forEach((mail) => {
      if (mail.starred) starredDelta += 1;
      getMessageLabelIds(mail).forEach((labelId) => {
        labelDeltaById[labelId] = Number(labelDeltaById[labelId] ?? 0) + 1;
      });
    });
    applyCountsDelta({
      trash: -unreadRestored.length,
      inbox: unreadRestored.length,
      starred: starredDelta,
      labelUnreadById: labelDeltaById,
    });
    setSelectedIds(new Set());
  };

  const archiveBulk = async (ids: string[], archive: boolean) => {
    const selectedMails = mails.filter((m) => ids.includes(m.id));
    const selected = selectedMails
      .map((m) => m.recipientId ?? m.messageId ?? m.id);
    if (!selected.length) return;
    if (archive) {
      await Promise.all(selected.map((id) => archiveInboxRow(id)));
      const unreadMoved = selectedMails.filter((mail) => !mail.read);
      const labelDeltaById: Record<string, number> = {};
      let starredDelta = 0;
      unreadMoved.forEach((mail) => {
        if (mail.starred) starredDelta -= 1;
        if (countsLabelAware) {
          getMessageLabelIds(mail).forEach((labelId) => {
            labelDeltaById[labelId] = Number(labelDeltaById[labelId] ?? 0) - 1;
          });
        }
      });
      applyCountsDelta({
        inbox: -unreadMoved.length,
        archived: unreadMoved.length,
        starred: starredDelta,
        labelUnreadById: countsLabelAware ? labelDeltaById : undefined,
      });
    } else {
      await Promise.all(selected.map((id) => unarchiveInboxRow(id)));
      const unreadMoved = selectedMails.filter((mail) => !mail.read);
      const labelDeltaById: Record<string, number> = {};
      let starredDelta = 0;
      unreadMoved.forEach((mail) => {
        if (mail.starred) starredDelta += 1;
        getMessageLabelIds(mail).forEach((labelId) => {
          labelDeltaById[labelId] = Number(labelDeltaById[labelId] ?? 0) + 1;
        });
      });
      applyCountsDelta({
        archived: -unreadMoved.length,
        inbox: unreadMoved.length,
        starred: starredDelta,
        labelUnreadById: labelDeltaById,
      });
    }
    setSelectedIds(new Set());
  };

  const snoozeBulk = async (ids: string[], snoozedUntil: string) => {
    const selectedMails = mails.filter((m) => ids.includes(m.id));
    const selected = selectedMails
      .map((m) => m.recipientId ?? m.messageId ?? m.id);
    if (!selected.length) return;
    await Promise.all(selected.map((id) => snoozeInboxRow(id, snoozedUntil)));
    const unreadMoved = selectedMails.filter((mail) => !mail.read);
    const labelDeltaById: Record<string, number> = {};
    let starredDelta = 0;
    unreadMoved.forEach((mail) => {
      if (mail.starred) starredDelta -= 1;
      if (countsLabelAware) {
        getMessageLabelIds(mail).forEach((labelId) => {
          labelDeltaById[labelId] = Number(labelDeltaById[labelId] ?? 0) - 1;
        });
      }
    });
    applyCountsDelta({
      inbox: -unreadMoved.length,
      snoozed: unreadMoved.length,
      starred: starredDelta,
      labelUnreadById: countsLabelAware ? labelDeltaById : undefined,
    });
    setSelectedIds(new Set());
  };

  const assignLabelBulk = async (ids: string[], labelIdToAssign: string) => {
    const selected = mails
      .filter((m) => ids.includes(m.id))
      .map((m) => m.messageId ?? m.id);
    if (!selected.length) return;
    const unreadWithoutLabel = mails
      .filter((mail) => ids.includes(mail.id) && !mail.read)
      .filter((mail) => !getMessageLabelIds(mail).includes(labelIdToAssign))
      .map((mail) => mail.id);
    await Promise.all(selected.map((messageId) => assignLabelToMessage(messageId, labelIdToAssign)));
    if (countsLabelAware && unreadWithoutLabel.length) {
      applyUnreadByLabelDelta([labelIdToAssign], unreadWithoutLabel.length);
    }
    if (unreadWithoutLabel.length) {
      setMessageLabelIdsByMessage((prev) => {
        const next = { ...prev };
        unreadWithoutLabel.forEach((mailId) => {
          next[mailId] = Array.from(new Set([...(next[mailId] ?? []), labelIdToAssign]));
        });
        return next;
      });
    }
    setSelectedIds(new Set());
  };

  const removeLabelBulk = async (ids: string[], labelIdToRemove: string) => {
    const selected = mails
      .filter((m) => ids.includes(m.id))
      .map((m) => m.messageId ?? m.id);
    if (!selected.length) return;
    const unreadWithLabel = mails
      .filter((mail) => ids.includes(mail.id) && !mail.read)
      .filter((mail) => getMessageLabelIds(mail).includes(labelIdToRemove))
      .map((mail) => mail.id);
    await Promise.all(selected.map((messageId) => removeLabelFromMessage(messageId, labelIdToRemove)));
    if (countsLabelAware && unreadWithLabel.length) {
      applyUnreadByLabelDelta([labelIdToRemove], -unreadWithLabel.length);
    }
    if (labelId && labelIdToRemove === labelId) {
      selected.forEach((messageId) => removeMessageRowLocally(messageId));
    }
    if (unreadWithLabel.length) {
      setMessageLabelIdsByMessage((prev) => {
        const next = { ...prev };
        unreadWithLabel.forEach((mailId) => {
          next[mailId] = (next[mailId] ?? []).filter((id) => id !== labelIdToRemove);
        });
        return next;
      });
    }
    setSelectedIds(new Set());
  };

  const toggleStar = async (id: string) => {
    const target = mails.find((m) => m.id === id);
    if (!target) return;

    const actionId = target.recipientId ?? target.messageId ?? target.id;
    const previousStarred = target.starred;
    const nextStarred = !previousStarred;

    setLocalStarredById((prev) => ({
      ...prev,
      [target.id]: nextStarred,
      [actionId]: nextStarred,
    }));

    try {
      await starInboxRow(actionId, nextStarred);
      if (!target.read) {
        applyCountsDelta({ starred: nextStarred ? 1 : -1 });
      }
    } catch {
      setLocalStarredById((prev) => ({
        ...prev,
        [target.id]: previousStarred,
        [actionId]: previousStarred,
      }));
      setLabelError("No se pudo actualizar el destacado del mensaje.");
    }
  };

  const toggleArchive = async (id: string) => {
    const target = mails.find((m) => m.id === id);
    if (!target) return;
    const actionId = target.recipientId ?? target.messageId ?? target.id;
    const labelDeltaIds = getMessageLabelIds(target);
    if (folder === "archived") {
      await unarchiveInboxRow(actionId);
      if (!target.read) {
        applyCountsDelta({
          archived: -1,
          inbox: 1,
          starred: target.starred ? 1 : 0,
        });
        applyUnreadByLabelDelta(labelDeltaIds, 1);
      }
      return;
    }
    await archiveInboxRow(actionId);
    if (!target.read) {
      applyCountsDelta({
        inbox: folder === "inbox" || folder === "starred" || folder === "all" ? -1 : 0,
        archived: 1,
        starred: target.starred ? -1 : 0,
      });
      if (countsLabelAware) applyUnreadByLabelDelta(labelDeltaIds, -1);
    }
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
    if (!target.read) {
      applyCountsDelta({
        inbox: folder === "inbox" || folder === "starred" || folder === "all" ? -1 : 0,
        snoozed: 1,
        starred: target.starred ? -1 : 0,
      });
      if (countsLabelAware) applyUnreadByLabelDelta(getMessageLabelIds(target), -1);
    }
    setSnoozeTargetId(null);
  };

  const unsnooze = async (id: string) => {
    const target = mails.find((m) => m.id === id);
    if (!target) return;
    await unsnoozeInboxRow(target.recipientId ?? target.messageId ?? target.id);
    if (!target.read) {
      applyCountsDelta({
        snoozed: -1,
        inbox: 1,
        starred: target.starred ? 1 : 0,
      });
      applyUnreadByLabelDelta(getMessageLabelIds(target), 1);
    }
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
                availableLabels={labels.filter((item) => item.type === "CUSTOM")}
                selectedLabelIds={activeMailId ? (messageLabelIdsByMessage[activeMailId] ?? []) : []}
                onToggleLabel={(messageId, labelId, selected) => {
                  void (async () => {
                    if (selected) await removeLabelFromMessage(messageId, labelId);
                    else await assignLabelToMessage(messageId, labelId);
                    const isUnread = Boolean(activeMail && activeMail.messageId === messageId && !activeMail.read);
                    if (isUnread && countsLabelAware) {
                      applyUnreadByLabelDelta([labelId], selected ? -1 : 1);
                    }
                    setMessageLabelIdsByMessage((prev) => ({
                      ...prev,
                      [messageId]: selected
                        ? (prev[messageId] ?? []).filter((id) => id !== labelId)
                        : Array.from(new Set([...(prev[messageId] ?? []), labelId])),
                    }));
                  })();
                }}
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
                  onSnoozeBulk={(ids, snoozedUntil) => void snoozeBulk(ids, snoozedUntil)}
                  onAssignLabelBulk={(ids, labelIdToAssign) => void assignLabelBulk(ids, labelIdToAssign)}
                  onRemoveLabelBulk={(ids, labelIdToRemove) => void removeLabelBulk(ids, labelIdToRemove)}
                  labels={labels.filter((item) => item.type === "CUSTOM")}
                  onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
                  onNextPage={() => setPage((p) => (p < pageCount ? p + 1 : p))}
                  onRefresh={() => void reload()}
                />

                <MailList
                  mails={mails}
                  loading={loading}
                  error={error}
                  selectedIds={selectedIds}
                  onOpen={(id) => {
                    if (folder === "drafts") {
                      const rawDraft = items.find((item): item is SentMessageItem => !("recipient" in item) && item.id === id);
                      if (!rawDraft) return;
                      openCompose({
                        editingDraftId: rawDraft.id,
                        to: extractDraftRecipients(rawDraft.bodyJson),
                        subject: rawDraft.subject || "",
                        body: rawDraft.bodyHtml || "",
                        bodyJson: rawDraft.bodyJson ?? null,
                        attachmentIds: extractDraftAttachmentIds(rawDraft.bodyJson),
                        mode: "new",
                        parentMessageId: null,
                      });
                      return;
                    }
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
        labels={labels.filter((item) => item.type === "CUSTOM")}
        savingComposeIds={savingComposeIds}
        sendingComposeIds={sendingComposeIds}
        discardingComposeIds={discardingComposeIds}
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



