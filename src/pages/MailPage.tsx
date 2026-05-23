import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import type { Mail } from "@/features/mail/types/mail-ui.types";
import MailToolbar from "@/features/mail/components/MailToolbar";
import MailList from "@/features/mail/components/MailList";
import MailDetail from "@/features/mail/components/MailDetail";
import MailFilesView from "@/features/mail/components/MailFilesView";
import SnoozeDateTimeModal from "@/features/mail/components/SnoozeDateTimeModal";
import NotificationComposeStack from "@/features/mail/components/ComposeStack";
import type { NotificationComposeDraft } from "@/features/mail/components/ComposeModal";
import { useMessagesV2 } from "@/features/mail/hooks/useMessagesV2";
import {
  cancelScheduledMessage,
  rescheduleMessage,
  scheduleMessage,
  sendScheduledMessageNow,
  forwardMessage,
  getMessageDetail,
  bulkMessages,
  assignLabelToMessage,
  removeLabelFromMessage,
  permanentlyDeleteMessage,
  replyMessage,
  sendMessage,
  uploadAttachment,
  deleteAttachment as deleteRemoteAttachment,
  executeMessageAction,
  listMyMailFiles,
  bulkDeleteMyMailFiles,
  deleteMyMailFile,
} from "@/features/mail/services/messages.service";
import { createDraft, deleteDraft, sendDraft, updateDraft } from "@/features/mail/services/drafts.service";
import type { InboxItem, MailFileItem, MailMessageActionItem, SentMessageItem } from "@/features/mail/types/message.types";
import { useSileoMessageEvents } from "@/features/mail/hooks/useSileoMessageEvents";
import { useMailDashboardContext } from "@/features/mail/context/MailDashboardProvider";
import { NOTIFICATION_WINDOW_EVENTS } from "@/features/mail/constants/mail-events.constants";
import { showNotificationToast } from "@/features/mail/services/mail-toast.service";
import type { MailActionUpdatedPayload, MessageCreatedRealtimePayload } from "@/features/mail/types/realtime.types";
import { extractMailDetailLabelIds, sameStringArray } from "@/features/mail/utils/mail-state.utils";
import { mapMailAttachment, type BackendMailAttachment } from "@/features/mail/utils/mail-attachments.utils";
import { normalizeConversationSubject } from "@/features/mail/utils/mail-subject.utils";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useUserDetails } from "@/shared/hooks/useUserDetails";
import { resolveProfileAvatarUrl } from "@/features/profile/components/profile.utils";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { Modal } from "@/shared/components/modales/Modal";

const createComposeId = () => `compose-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const MAX_COMPOSE_DRAFTS = 4;
const COMPOSE_AUTOSAVE_DEBOUNCE_MS = 1_500;
const COMPOSE_AUTOSAVE_FALLBACK_MS = 60_000;

type UiFolder = "inbox" | "starred" | "sent" | "scheduled" | "drafts" | "trash" | "archived" | "snoozed" | "all" | "files";

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
  recipient?: { id?: string; readAt?: string | null; starredAt?: string | null } | null;
  message?: {
    id: string;
    threadId?: string | null;
    originModule?: string | null;
    kind?: "SYSTEM_NOTIFICATION" | "USER_MESSAGE" | "SYSTEM_MESSAGE";
    senderType?: "USER" | "SYSTEM";
    subject?: string;
    bodyHtml?: string;
    bodyText?: string;
    sentAt?: string | null;
    createdAt?: string;
  } | null;
  sender?: { id?: string; name?: string; email?: string } | null;
  recipients?: Array<{ id?: string; recipientEmail?: string; recipientType?: string }>;
  attachments?: BackendMailAttachment[];
    thread?: Array<{
    id: string;
    subject: string;
    bodyHtml: string;
    bodyJson?: Record<string, unknown> | null;
    createdAt: string;
    sentAt?: string | null;
    kind?: "SYSTEM_NOTIFICATION" | "USER_MESSAGE" | "SYSTEM_MESSAGE";
    senderType?: "USER" | "SYSTEM";
    sender?: { id?: string; name?: string; email?: string } | null;
      recipients?: Array<{ id?: string; recipientEmail?: string; recipientType?: string }>;
      attachments?: BackendMailAttachment[];
      actions?: MailMessageActionItem[];
      threadLabel?: string | null;
    }>;
  labels?: Array<{ id?: string; labelId?: string }>;
  permissions?: { canReply?: boolean; canForward?: boolean };
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
      kind: item.message.kind,
      senderType: item.message.senderType,
      originModule,
      moduleLabel: ORIGIN_MODULE_TO_LABEL[originModule] ?? originModule,
      latestMessageId: item.message.latestMessageId,
      threadMessageCount: item.message.threadMessageCount,
      threadLatestIndex: item.message.threadLatestIndex,
      threadLabel: item.message.threadLabel,
      from: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ name: "Yo", email: "" }],
      subject: normalizeConversationSubject(item.message.subject),
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
    kind: item.kind,
    senderType: item.senderType,
    originModule,
    moduleLabel: ORIGIN_MODULE_TO_LABEL[originModule] ?? originModule,
    latestMessageId: item.latestMessageId,
    threadMessageCount: item.threadMessageCount,
    threadLatestIndex: item.threadLatestIndex,
    threadLabel: item.threadLabel,
    from: { name: "Yo", email: "" },
    to: [{ name: "Destinatarios", email: "" }],
    subject: normalizeConversationSubject(item.subject),
    body: item.bodyHtml,
    preview: item.bodyText?.slice(0, 110) ?? "",
    date: folder === "scheduled" ? (item.scheduledAt ?? item.createdAt) : (item.sentAt ?? item.createdAt),
    read: folder !== "scheduled",
    starred: false,
    folder,
    category: ORIGIN_MODULE_TO_CATEGORY[originModule] ?? "personal",
    attachments: [],
  };
};

const mergeActionIntoDetail = (
  detail: MailDetailData,
  action: MailMessageActionItem,
): MailDetailData => {
  if (!detail?.thread?.length) return detail;
  let touched = false;
  const nextThread = detail.thread.map((threadItem, index) => {
    const existing = threadItem.actions ?? [];
    const indexById = existing.findIndex((item) => item.id === action.id);
    const matchesMessage = action.messageId && threadItem.id === action.messageId;
    const shouldAttachThreadLevel = !action.messageId && index === 0;
    if (indexById < 0 && !matchesMessage && !shouldAttachThreadLevel) return threadItem;
    touched = true;
    if (indexById >= 0) {
      const updated = [...existing];
      updated[indexById] = action;
      return { ...threadItem, actions: updated };
    }
    return { ...threadItem, actions: [...existing, action] };
  });
  return touched ? { ...detail, thread: nextThread } : detail;
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
  const [snoozeDateModalOpen, setSnoozeDateModalOpen] = useState(false);
  const [customSnoozeDate, setCustomSnoozeDate] = useState<Date>(new Date());
  const [scheduledTargetId, setScheduledTargetId] = useState<string | null>(null);
  const [scheduledDateModalOpen, setScheduledDateModalOpen] = useState(false);
  const [customScheduledDate, setCustomScheduledDate] = useState<Date>(new Date());
  const [mailFiles, setMailFiles] = useState<MailFileItem[]>([]);
  const [mailFilesTotal, setMailFilesTotal] = useState(0);
  const [mailFilesLoading, setMailFilesLoading] = useState(false);
  const [mailFilesError, setMailFilesError] = useState<string | null>(null);
  const [activeMailDetail, setActiveMailDetail] = useState<MailDetailData>(null);
  const [messageLabelIdsByMessage, setMessageLabelIdsByMessage] = useState<Record<string, string[]>>({});
  const [localStarredById, setLocalStarredById] = useState<Record<string, boolean>>({});
  const composeDraftsRef = useRef<NotificationComposeDraft[]>([]);
  const persistedSignaturesRef = useRef<Map<string, string>>(new Map());
  const composeAutosaveTimeoutsRef = useRef<Map<string, number>>(new Map());
  const savingComposeIdsRef = useRef<Set<string>>(new Set());
  const sendingComposeIdsRef = useRef<Set<string>>(new Set());
  const discardingComposeIdsRef = useRef<Set<string>>(new Set());
  const mailsRef = useRef<Mail[]>([]);
  const rawLabelIdsByMessageIdRef = useRef<Map<string, string[]>>(new Map());

  const { can } = usePermissions();
  const { userDetails } = useUserDetails();
  const canCreateLabel = can("notifications.labels.create");
  const { labels, createLabel, deleteLabel, applyCountsDelta, applyUnreadByLabelDelta, reloadStorage } = useMailDashboardContext();
  const currentUserName = userDetails?.data?.name ?? "Usuario";
  const currentUserEmail = userDetails?.data?.email ?? "";
  const currentUserAvatarUrl = resolveProfileAvatarUrl(userDetails?.data?.avatarUrl) || undefined;
  const isFilesFolder = folder === "files";

  const {
    items,
    total,
    loading,
    error,
    reload,
    setInboxRowReadLocally,
    starInboxRow,
    archiveInboxRow,
    unarchiveInboxRow,
    snoozeInboxRow,
    unsnoozeInboxRow,
    removeRecipientRowLocally,
    removeMessageRowLocally,
    insertRealtimeInboxItem,
  } = useMessagesV2({
    folder: isFilesFolder ? "inbox" : folder,
    labelId,
    q,
    page,
    limit: pageSize,
    enabled: !isFilesFolder,
  });

  const handleRealtimeMessageCreated = useCallback((payload: MessageCreatedRealtimePayload) => {
    const countsDelta: NonNullable<MessageCreatedRealtimePayload["countsDelta"]> =
      payload.countsDelta ?? { inbox: 1 };
    const canAffectUnreadLabelCounts = !payload.recipient?.readAt;
    const labelUnreadById = canAffectUnreadLabelCounts
      ? (payload.labels ?? [])
          .filter((label) => label.type === "CUSTOM")
          .reduce<Record<string, number>>((acc, label) => {
            acc[label.id] = (acc[label.id] ?? 0) + 1;
            return acc;
          }, {})
      : undefined;

    applyCountsDelta({
      ...countsDelta,
      labelUnreadById,
    });
    const insertedInbox = insertRealtimeInboxItem(payload);

    if (!insertedInbox && folder === "scheduled" && (countsDelta.scheduled ?? 0) < 0 && payload.message?.id) {
      removeMessageRowLocally(payload.message.id);
      if (activeMailId === payload.message.id) {
        setActiveMailId(null);
        setActiveMailDetail(null);
      }
    }
  }, [activeMailId, applyCountsDelta, folder, insertRealtimeInboxItem, removeMessageRowLocally]);

  const handleMailActionUpdated = useCallback((payload: MailActionUpdatedPayload) => {
    const mappedAction: MailMessageActionItem = {
      id: payload.actionId,
      threadId: payload.threadId,
      messageId: payload.messageId ?? null,
      actionKey: payload.actionKey,
      actionType: payload.actionType,
      targetEntityType: payload.targetEntityType,
      targetEntityId: payload.targetEntityId,
      status: payload.status,
      completedByUserId: payload.completedByUserId ?? null,
      completedByName: payload.completedByName ?? null,
      completedAt: payload.completedAt ?? null,
      version: payload.version,
      metadata: payload.metadata ?? null,
      canExecute: payload.canExecute,
    };
    setActiveMailDetail((prev) => {
      if (!prev) return prev;
      const currentThreadId = prev.message?.threadId ?? null;
      const payloadThreadId = payload.threadId ?? null;
      const sameThread = Boolean(currentThreadId && payloadThreadId && currentThreadId === payloadThreadId);
      if (!sameThread) return prev;
      return mergeActionIntoDetail(prev, mappedAction);
    });
  }, []);

  useSileoMessageEvents({
    onRefreshMessages: reload,
    onRealtimeMessageCreated: handleRealtimeMessageCreated,
    onMailActionUpdated: handleMailActionUpdated,
  });

  const loadMailFiles = useCallback(async () => {
    if (!isFilesFolder) return;
    setMailFilesLoading(true);
    setMailFilesError(null);
    try {
      const response = await listMyMailFiles({ page, limit: pageSize, q });
      setMailFiles(response.items ?? []);
      setMailFilesTotal(Number(response.total ?? 0));
    } catch {
      setMailFiles([]);
      setMailFilesTotal(0);
      setMailFilesError("No se pudieron cargar los archivos.");
    } finally {
      setMailFilesLoading(false);
    }
  }, [isFilesFolder, page, pageSize, q]);

  useEffect(() => {
    if (!isFilesFolder) {
      setMailFiles([]);
      setMailFilesTotal(0);
      setMailFilesError(null);
      setMailFilesLoading(false);
      return;
    }
    void loadMailFiles();
  }, [isFilesFolder, loadMailFiles]);

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
    mailsRef.current = mails;
  }, [mails]);

  useEffect(() => {
    composeDraftsRef.current = composeDrafts;
    const aliveIds = new Set(composeDrafts.map((item) => item.id));
    Array.from(persistedSignaturesRef.current.keys()).forEach((id) => {
      if (!aliveIds.has(id)) persistedSignaturesRef.current.delete(id);
    });
    Array.from(composeAutosaveTimeoutsRef.current.entries()).forEach(([id, timeoutId]) => {
      if (aliveIds.has(id)) return;
      window.clearTimeout(timeoutId);
      composeAutosaveTimeoutsRef.current.delete(id);
    });
  }, [composeDrafts]);

  useEffect(() => {
    savingComposeIdsRef.current = savingComposeIds;
  }, [savingComposeIds]);

  useEffect(() => {
    sendingComposeIdsRef.current = sendingComposeIds;
  }, [sendingComposeIds]);

  useEffect(() => {
    discardingComposeIdsRef.current = discardingComposeIds;
  }, [discardingComposeIds]);

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

  const isComposeDraftDirty = useCallback((draft: NotificationComposeDraft) => {
    const current = serializeComposeDraft(draft);
    const persisted = persistedSignaturesRef.current.get(draft.id);
    return current !== persisted;
  }, []);

  const clearComposeAutosaveTimer = useCallback((composeId: string) => {
    const timeoutId = composeAutosaveTimeoutsRef.current.get(composeId);
    if (typeof timeoutId !== "number") return;
    window.clearTimeout(timeoutId);
    composeAutosaveTimeoutsRef.current.delete(composeId);
  }, []);

  const scheduleComposeAutosave = useCallback(
    (composeId: string, delayMs = COMPOSE_AUTOSAVE_DEBOUNCE_MS) => {
      clearComposeAutosaveTimer(composeId);
      const timeoutId = window.setTimeout(() => {
        composeAutosaveTimeoutsRef.current.delete(composeId);
        const draft = composeDraftsRef.current.find((item) => item.id === composeId);
        if (!draft || draft.minimized) return;
        if (sendingComposeIdsRef.current.has(composeId) || savingComposeIdsRef.current.has(composeId) || discardingComposeIdsRef.current.has(composeId)) return;
        if (!isComposeDraftDirty(draft)) return;
        void persistComposeDraft(composeId);
      }, delayMs);
      composeAutosaveTimeoutsRef.current.set(composeId, timeoutId);
    },
    [clearComposeAutosaveTimer, isComposeDraftDirty, persistComposeDraft],
  );

  const flushDirtyComposeDrafts = useCallback(() => {
    const drafts = composeDraftsRef.current;
    drafts.forEach((draft) => {
      if (draft.minimized) return;
      if (sendingComposeIdsRef.current.has(draft.id) || savingComposeIdsRef.current.has(draft.id) || discardingComposeIdsRef.current.has(draft.id)) return;
      if (!isComposeDraftDirty(draft)) return;
      clearComposeAutosaveTimer(draft.id);
      void persistComposeDraft(draft.id);
    });
  }, [clearComposeAutosaveTimer, isComposeDraftDirty, persistComposeDraft]);

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
    clearComposeAutosaveTimer(composeId);
    setComposeDrafts((prev) => prev.filter((item) => item.id !== composeId));
    persistedSignaturesRef.current.delete(composeId);
  }, [clearComposeAutosaveTimer]);

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
    const valid: UiFolder[] = ["inbox", "starred", "sent", "scheduled", "drafts", "trash", "archived", "snoozed", "all", "files"];
    if (valid.includes(folderParam as UiFolder)) setFolder(folderParam as UiFolder);
    else setFolder("inbox");
  }, [params.folder]);

  useEffect(() => {
    composeDrafts.forEach((draft) => {
      if (draft.minimized) {
        clearComposeAutosaveTimer(draft.id);
        return;
      }
      if (sendingComposeIdsRef.current.has(draft.id) || savingComposeIdsRef.current.has(draft.id) || discardingComposeIdsRef.current.has(draft.id)) return;
      if (!isComposeDraftDirty(draft)) {
        clearComposeAutosaveTimer(draft.id);
        return;
      }
      scheduleComposeAutosave(draft.id);
    });
  }, [clearComposeAutosaveTimer, composeDrafts, isComposeDraftDirty, scheduleComposeAutosave]);

  useEffect(() => {
    const id = window.setInterval(() => {
      flushDirtyComposeDrafts();
    }, COMPOSE_AUTOSAVE_FALLBACK_MS);
    return () => window.clearInterval(id);
  }, [flushDirtyComposeDrafts]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      const hasDirtyDraft = composeDraftsRef.current.some((draft) => {
        if (draft.minimized) return false;
        return isComposeDraftDirty(draft);
      });
      if (!hasDirtyDraft) return;
      flushDirtyComposeDrafts();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [flushDirtyComposeDrafts, isComposeDraftDirty]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== "hidden") return;
      flushDirtyComposeDrafts();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [flushDirtyComposeDrafts]);

  useEffect(
    () => () => {
      Array.from(composeAutosaveTimeoutsRef.current.values()).forEach((timeoutId) => window.clearTimeout(timeoutId));
      composeAutosaveTimeoutsRef.current.clear();
    },
    [],
  );

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

  const currentTotal = isFilesFolder ? mailFilesTotal : total;
  const currentListLength = isFilesFolder ? mailFiles.length : mails.length;
  const start = currentTotal === 0 ? 0 : (page - 1) * pageSize;
  const end = Math.min(start + currentListLength, currentTotal);
  const pageMailIds = isFilesFolder ? mailFiles.map((file) => file.id) : mails.map((mail) => mail.id);
  const pageReadIds = isFilesFolder ? [] : mails.filter((mail) => mail.read).map((mail) => mail.id);
  const pageUnreadIds = isFilesFolder ? [] : mails.filter((mail) => !mail.read).map((mail) => mail.id);
  const pageStarredIds = isFilesFolder ? [] : mails.filter((mail) => mail.starred).map((mail) => mail.id);
  const pageCount = Math.max(1, Math.ceil(currentTotal / pageSize));

  const activeMail = useMemo(() => {
    const listMail = mails.find((m) => m.id === activeMailId) ?? null;
    const detailMessage = activeMailDetail?.message;
    const detailAttachments = (activeMailDetail?.attachments ?? []).map((attachment) => mapMailAttachment(attachment));

    if (listMail) {
      return {
        ...listMail,
        kind: detailMessage?.kind ?? listMail.kind,
        senderType: detailMessage?.senderType ?? listMail.senderType,
        body: detailMessage?.bodyHtml ?? listMail.body,
        preview: detailMessage?.bodyText?.slice(0, 110) ?? listMail.preview,
        attachments: detailAttachments,
      };
    }

    if (!detailMessage) return null;

    const originModule = detailMessage.originModule ?? "corporate";
    const senderName = activeMailDetail?.sender?.name?.trim() || (detailMessage.senderType === "SYSTEM" ? "Sistema" : "Usuario");
    const senderEmail = activeMailDetail?.sender?.email?.trim() || (detailMessage.senderType === "SYSTEM" ? "no-reply@eunoia.local" : "usuario@eunoia.local");

    return {
      id: detailMessage.id,
      messageId: detailMessage.id,
      recipientId: activeMailDetail?.recipient?.id,
      threadId: detailMessage.threadId ?? null,
      kind: detailMessage.kind,
      senderType: detailMessage.senderType,
      originModule,
      moduleLabel: ORIGIN_MODULE_TO_LABEL[originModule] ?? originModule,
      from: { name: senderName, email: senderEmail },
      to: [{ name: "Yo", email: "" }],
      subject: detailMessage.subject ?? "(Sin asunto)",
      body: detailMessage.bodyHtml ?? "",
      preview: detailMessage.bodyText?.slice(0, 110) ?? "",
      date: detailMessage.sentAt ?? detailMessage.createdAt ?? new Date().toISOString(),
      read: Boolean(activeMailDetail?.recipient?.readAt),
      starred: Boolean(activeMailDetail?.recipient?.starredAt),
      folder,
      category: ORIGIN_MODULE_TO_CATEGORY[originModule] ?? "personal",
      attachments: detailAttachments,
    } satisfies Mail;
  }, [activeMailDetail, activeMailId, folder, mails]);
  const recoverMutationState = useCallback(
    async (message: string) => {
      await reload();
      window.dispatchEvent(new Event(NOTIFICATION_WINDOW_EVENTS.messagesRefresh));
      showNotificationToast({
        title: "No se pudo completar la accion",
        message,
        priority: "HIGH",
      });
    },
    [reload],
  );

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
  const getMessageLabelIds = useCallback(
    (mail: Mail) => rawLabelIdsByMessageId.get(mail.messageId ?? mail.id) ?? [],
    [rawLabelIdsByMessageId],
  );

  useEffect(() => {
    rawLabelIdsByMessageIdRef.current = rawLabelIdsByMessageId;
  }, [rawLabelIdsByMessageId]);

  useEffect(() => {
    if (!activeMailId) {
      setActiveMailDetail(null);
      return;
    }
    let active = true;
    void (async () => {
      const targetMail = mailsRef.current.find((currentMail) => currentMail.id === activeMailId) ?? null;
      const shouldMarkReadLocally = Boolean(targetMail && !targetMail.read && targetMail.recipientId);
      try {
        const detail = await getMessageDetail(activeMailId);
        if (!active) return;
        setActiveMailDetail(detail);
        const extracted = extractMailDetailLabelIds(detail);
        setMessageLabelIdsByMessage((prev) => {
          const current = prev[activeMailId] ?? [];
          if (sameStringArray(current, extracted)) return prev;
          return { ...prev, [activeMailId]: extracted };
        });
        if (shouldMarkReadLocally && targetMail?.recipientId) {
          setInboxRowReadLocally(targetMail.recipientId, true);
          const unreadBucket = unreadBucketByFolder(folder);
          const labelDeltaById: Record<string, number> = {};
          if (countsLabelAware) {
            (rawLabelIdsByMessageIdRef.current.get(targetMail.messageId ?? targetMail.id) ?? []).forEach((labelId) => {
              labelDeltaById[labelId] = Number(labelDeltaById[labelId] ?? 0) - 1;
            });
          }
          const deltaPayload: Partial<{ inbox: number; trash: number; archived: number; snoozed: number; starred: number }> = {
            starred: targetMail.starred ? -1 : 0,
          };
          if (unreadBucket) deltaPayload[unreadBucket] = -1;
          applyCountsDelta({
            ...deltaPayload,
            labelUnreadById: countsLabelAware ? labelDeltaById : undefined,
          });
        }
      } catch {
        if (!active) return;
        setActiveMailDetail(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    activeMailId,
    applyCountsDelta,
    countsLabelAware,
    folder,
    setInboxRowReadLocally,
  ]);

  const markRead = async (ids: string[], read: boolean) => {
    try {
      const selectedMails = mails.filter((m) => ids.includes(m.id));
      const targetMails = selectedMails.filter((mail) => (read ? !mail.read : mail.read));
      const selectedStateIds = targetMails
        .map((mail) => mail.recipientId)
        .filter((id): id is string => Boolean(id));
      if (!selectedStateIds.length) {
        setSelectedIds(new Set());
        return;
      }
      await bulkMessages({
        messageStateIds: selectedStateIds,
        action: read ? "MARK_AS_READ" : "MARK_AS_UNREAD",
      });
      targetMails.forEach((mail) => {
        if (!mail.recipientId) return;
        setInboxRowReadLocally(mail.recipientId, read);
      });
      const unreadBucket = unreadBucketByFolder(folder);
      let unreadDelta = 0;
      let starredDelta = 0;
      const labelDeltaById: Record<string, number> = {};

      targetMails.forEach((mail) => {
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
    } catch {
      await recoverMutationState("No se pudo actualizar el estado de lectura.");
    }
  };

  const createInlineDraft = async (input: {
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body: string;
    bodyJson?: Record<string, unknown> | null;
    attachmentIds?: string[];
  }) => {
    const recipients = [input.to, input.cc, input.bcc].filter(Boolean).join(", ");
    const created = await createDraft({
      recipients,
      subject: input.subject,
      bodyHtml: input.body,
      bodyJson: {
        ...(input.bodyJson ?? {}),
        draftRecipients: recipients,
        draftAttachmentIds: input.attachmentIds ?? [],
      },
      originModule: "corporate",
    });
    const draftId = String(created?.id ?? "");
    if (!draftId) throw new Error("DRAFT_CREATE_FAILED");
    return draftId;
  };

  const sendInlineCompose = async (input: {
    mode: "reply" | "forward";
    parentMessageId: string;
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body: string;
    bodyJson?: Record<string, unknown> | null;
    attachmentIds?: string[];
  }) => {
    if (input.mode === "reply") {
      await replyMessage(input.parentMessageId, {
        bodyHtml: input.body,
        bodyJson: input.bodyJson ?? null,
        to: parseRecipientList(input.to),
        cc: parseRecipientList(input.cc),
        bcc: parseRecipientList(input.bcc),
        attachmentIds: input.attachmentIds ?? [],
      });
    } else {
      await forwardMessage(input.parentMessageId, {
        bodyHtml: input.body,
        bodyJson: input.bodyJson ?? null,
        to: parseRecipientList(input.to),
        cc: parseRecipientList(input.cc),
        bcc: parseRecipientList(input.bcc),
        attachmentIds: input.attachmentIds ?? [],
      });
    }

    const detail = await getMessageDetail(activeMailId || input.parentMessageId);
    setActiveMailDetail(detail);
  };

  const executeThreadAction = async (actionId: string) => {
    try {
      const response = await executeMessageAction(actionId);
      setActiveMailDetail((prev) => mergeActionIntoDetail(prev, response.action));
    } catch {
      showNotificationToast({
        title: "No se pudo completar la acción",
        message: "Verifica permisos o estado actual de la compra.",
        priority: "HIGH",
      });
    }
  };

  const moveToTrash = async (ids: string[]) => {
    try {
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

      if (folder === "scheduled") {
        const selectedScheduledIds = mails
          .filter((m) => ids.includes(m.id))
          .map((m) => m.messageId ?? m.id);
        await Promise.all(selectedScheduledIds.map((id) => cancelScheduledMessage(id)));
        selectedScheduledIds.forEach((id) => removeMessageRowLocally(id));
        applyCountsDelta({ scheduled: -selectedScheduledIds.length, drafts: selectedScheduledIds.length });
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
        const selectedStateIds = selectedMails
          .map((mail) => mail.recipientId)
          .filter((id): id is string => Boolean(id));
        if (!selectedStateIds.length) {
          setSelectedIds(new Set());
          return;
        }
        await bulkMessages({
          messageStateIds: selectedStateIds,
          action: "DELETE",
        });
        selectedStateIds.forEach((id) => removeRecipientRowLocally(id));
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
    } catch {
      await recoverMutationState("No se pudo mover el mensaje a papelera.");
    }
  };

  const restoreFromTrash = async (ids: string[]) => {
    try {
      const selectedMails = mails.filter((m) => ids.includes(m.id));
      const selectedStateIds = selectedMails
        .map((mail) => mail.recipientId)
        .filter((id): id is string => Boolean(id));
      if (!selectedStateIds.length) {
        setSelectedIds(new Set());
        return;
      }
      await bulkMessages({
        messageStateIds: selectedStateIds,
        action: "RESTORE",
      });
      selectedStateIds.forEach((id) => removeRecipientRowLocally(id));
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
    } catch {
      await recoverMutationState("No se pudo restaurar el mensaje.");
    }
  };

  const archiveBulk = async (ids: string[], archive: boolean) => {
    try {
      const selectedMails = mails.filter((m) => ids.includes(m.id));
      const selectedStateIds = selectedMails
        .map((mail) => mail.recipientId)
        .filter((id): id is string => Boolean(id));
      if (!selectedStateIds.length) return;
      if (archive) {
        await bulkMessages({
          messageStateIds: selectedStateIds,
          action: "ARCHIVE",
        });
        selectedStateIds.forEach((id) => {
          if (folder === "inbox") removeRecipientRowLocally(id);
        });
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
        await bulkMessages({
          messageStateIds: selectedStateIds,
          action: "UNARCHIVE",
        });
        selectedStateIds.forEach((id) => {
          if (folder === "archived") removeRecipientRowLocally(id);
        });
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
    } catch {
      await recoverMutationState(archive ? "No se pudo archivar los mensajes." : "No se pudo desarchivar los mensajes.");
    }
  };

  const snoozeBulk = async (ids: string[], snoozedUntil: string) => {
    try {
      const selectedMails = mails.filter((m) => ids.includes(m.id));
      const selectedStateIds = selectedMails
        .map((mail) => mail.recipientId)
        .filter((id): id is string => Boolean(id));
      if (!selectedStateIds.length) return;
      await bulkMessages({
        messageStateIds: selectedStateIds,
        action: "SNOOZE",
        snoozedUntil,
      });
      selectedStateIds.forEach((id) => {
        if (folder !== "snoozed" && folder !== "all") removeRecipientRowLocally(id);
      });
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
    } catch {
      await recoverMutationState("No se pudo posponer los mensajes.");
    }
  };

  const assignLabelBulk = async (ids: string[], labelIdToAssign: string) => {
    try {
      const selectedMails = mails.filter((mail) => ids.includes(mail.id));
      const toAssign = selectedMails.filter((mail) => !getMessageLabelIds(mail).includes(labelIdToAssign));
      const selectedStateIds = toAssign
        .map((mail) => mail.recipientId)
        .filter((id): id is string => Boolean(id));
      if (!selectedStateIds.length) {
        setSelectedIds(new Set());
        return;
      }
      const unreadWithoutLabel = toAssign
        .filter((mail) => !mail.read)
        .map((mail) => mail.id);
      await bulkMessages({
        messageStateIds: selectedStateIds,
        action: "ASSIGN_LABEL",
        labelId: labelIdToAssign,
      });
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
    } catch {
      await recoverMutationState("No se pudo asignar la etiqueta.");
    }
  };

  const removeLabelBulk = async (ids: string[], labelIdToRemove: string) => {
    try {
      const selectedMails = mails.filter((mail) => ids.includes(mail.id));
      const toRemove = selectedMails.filter((mail) => getMessageLabelIds(mail).includes(labelIdToRemove));
      const selectedStateIds = toRemove
        .map((mail) => mail.recipientId)
        .filter((id): id is string => Boolean(id));
      if (!selectedStateIds.length) {
        setSelectedIds(new Set());
        return;
      }
      const unreadWithLabel = toRemove
        .filter((mail) => !mail.read)
        .map((mail) => mail.id);
      await bulkMessages({
        messageStateIds: selectedStateIds,
        action: "REMOVE_LABEL",
        labelId: labelIdToRemove,
      });
      if (countsLabelAware && unreadWithLabel.length) {
        applyUnreadByLabelDelta([labelIdToRemove], -unreadWithLabel.length);
      }
      if (labelId && labelIdToRemove === labelId) {
        toRemove.forEach((mail) => removeMessageRowLocally(mail.messageId ?? mail.id));
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
    } catch {
      await recoverMutationState("No se pudo quitar la etiqueta.");
    }
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
    try {
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
    } catch {
      await recoverMutationState("No se pudo actualizar el estado de archivado.");
    }
  };

  const openSnoozeDateModal = (id: string) => {
    setSnoozeTargetId(id);
    setCustomSnoozeDate(new Date());
    setSnoozeDateModalOpen(true);
  };

  const applySnoozeById = async (id: string, iso: string) => {
    const target = mails.find((m) => m.id === id);
    if (!target) return;
    try {
      await snoozeInboxRow(target.recipientId ?? target.messageId ?? target.id, iso);
      if (!target.read) {
        applyCountsDelta({
          inbox: folder === "inbox" || folder === "starred" || folder === "all" ? -1 : 0,
          snoozed: 1,
          starred: target.starred ? -1 : 0,
        });
        if (countsLabelAware) applyUnreadByLabelDelta(getMessageLabelIds(target), -1);
      }
      return true;
    } catch {
      await recoverMutationState("No se pudo posponer el mensaje.");
      return false;
    }
  };

  const scheduleCompose = async (
    composeId: string,
    scheduledAt: string,
    overrides?: Partial<Pick<NotificationComposeDraft, "to" | "cc" | "bcc" | "subject" | "body" | "selectedLabelIds" | "attachmentIds" | "bodyJson">>,
  ) => {
    if (sendingComposeIds.has(composeId) || savingComposeIds.has(composeId) || discardingComposeIds.has(composeId)) return;
    const currentDraft = composeDraftsRef.current.find((item) => item.id === composeId);
    if (!currentDraft) return;
    const draft = { ...currentDraft, ...overrides };
    if (!draft.to.trim() || !draft.subject.trim() || !draft.body.trim()) {
      updateComposeDraft(composeId, { error: "Completa destinatarios, asunto y cuerpo." });
      return;
    }
    if (draft.mode !== "new") {
      updateComposeDraft(composeId, { error: "La programación aplica para mensajes nuevos." });
      return;
    }
    try {
      setSendingComposeIds((prev) => new Set(prev).add(composeId));
      updateComposeDraft(composeId, { error: null });
      if (draft.editingDraftId) {
        await updateDraft(draft.editingDraftId, {
          recipients: draft.to,
          subject: draft.subject,
          bodyHtml: draft.body,
          bodyJson: buildDraftBodyJson(draft),
        });
      }
      await scheduleMessage({
        to: parseRecipientList(draft.to),
        cc: parseRecipientList(draft.cc),
        bcc: parseRecipientList(draft.bcc),
        subject: draft.subject,
        bodyHtml: draft.body,
        bodyJson: draft.bodyJson ?? null,
        scheduledAt,
        originModule: "corporate",
        labelIds: draft.selectedLabelIds,
        attachmentIds: draft.attachmentIds ?? [],
      });
      if (draft.editingDraftId) {
        await deleteDraft(draft.editingDraftId);
      }
      removeComposeDraft(composeId);
      applyCountsDelta({ scheduled: 1, drafts: draft.editingDraftId ? -1 : 0 });
      if (folder === "scheduled") {
        await reload();
      }
      persistedSignaturesRef.current.delete(composeId);
    } catch (error: unknown) {
      const backendMessage = isAxiosError<BackendErrorPayload>(error)
        ? error.response?.data?.message
        : undefined;
      updateComposeDraft(composeId, { error: Array.isArray(backendMessage) ? backendMessage[0] : backendMessage || "No se pudo programar el mensaje." });
    } finally {
      setSendingComposeIds((prev) => {
        const next = new Set(prev);
        next.delete(composeId);
        return next;
      });
    }
  };

  const applyCustomSnooze = async (date: Date) => {
    if (!snoozeTargetId) return;
    const success = await applySnoozeById(snoozeTargetId, date.toISOString());
    if (!success) return;
    setSnoozeDateModalOpen(false);
    setSnoozeTargetId(null);
  };

  const openScheduledDateModal = (id: string) => {
    setScheduledTargetId(id);
    setCustomScheduledDate(new Date(Date.now() + 60 * 60 * 1000));
    setScheduledDateModalOpen(true);
  };

  const sendScheduledNowById = async (id: string) => {
    const target = mails.find((m) => m.id === id);
    if (!target) return;
    try {
      await sendScheduledMessageNow(target.messageId ?? target.id);
      removeMessageRowLocally(target.messageId ?? target.id);
      applyCountsDelta({ scheduled: -1, sent: 1 });
      if (activeMailId === id) {
        setActiveMailId(null);
        setActiveMailDetail(null);
      }
    } catch {
      await recoverMutationState("No se pudo enviar el mensaje programado.");
    }
  };

  const cancelScheduledById = async (id: string) => {
    const target = mails.find((m) => m.id === id);
    if (!target) return;
    try {
      await cancelScheduledMessage(target.messageId ?? target.id);
      removeMessageRowLocally(target.messageId ?? target.id);
      applyCountsDelta({ scheduled: -1, drafts: 1 });
      if (activeMailId === id) {
        setActiveMailId(null);
        setActiveMailDetail(null);
      }
    } catch {
      await recoverMutationState("No se pudo cancelar la programación.");
    }
  };

  const applyCustomSchedule = async (date: Date) => {
    if (!scheduledTargetId) return;
    const target = mails.find((mail) => mail.id === scheduledTargetId);
    if (!target) return;
    try {
      await rescheduleMessage(target.messageId ?? target.id, date.toISOString());
      setScheduledDateModalOpen(false);
      setScheduledTargetId(null);
      if (folder === "scheduled") {
        await reload();
      }
    } catch {
      await recoverMutationState("No se pudo reprogramar el mensaje.");
    }
  };

  const unsnooze = async (id: string) => {
    const target = mails.find((m) => m.id === id);
    if (!target) return;
    try {
      await unsnoozeInboxRow(target.recipientId ?? target.messageId ?? target.id);
      if (!target.read) {
        applyCountsDelta({
          snoozed: -1,
          inbox: 1,
          starred: target.starred ? 1 : 0,
        });
        applyUnreadByLabelDelta(getMessageLabelIds(target), 1);
      }
    } catch {
      await recoverMutationState("No se pudo quitar la posposicion del mensaje.");
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

  const deleteMailFiles = useCallback(
    async (attachmentIds: string[]) => {
      const ids = Array.from(new Set((attachmentIds ?? []).filter(Boolean)));
      if (!ids.length) return;
      try {
        if (ids.length === 1) {
          await deleteMyMailFile(ids[0]);
        } else {
          await bulkDeleteMyMailFiles(ids);
        }
        setSelectedIds(new Set());
        await loadMailFiles();
        await reloadStorage();
      } catch {
        showNotificationToast({
          title: "No se pudo eliminar archivo(s)",
          message: "Verifica permisos y vuelve a intentar.",
          priority: "HIGH",
        });
      }
    },
    [loadMailFiles, reloadStorage],
  );

  return (
    <div className="h-full">
      <div className="grid h-full grid-cols-1 gap-4">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-background">
          <main className="flex flex-1 flex-col overflow-hidden bg-background">
            {isFilesFolder ? (
              <MailFilesView
                files={mailFiles}
                total={mailFilesTotal}
                loading={mailFilesLoading}
                error={mailFilesError}
                selectedIds={selectedIds}
                onToggleSelect={(id) =>
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                onSelectVisible={(ids) => setSelectedIds(new Set(ids))}
                onClearSelection={() => setSelectedIds(new Set())}
                onDeleteSelected={(ids) => {
                  return deleteMailFiles(ids);
                }}
                onDeleteOne={(id) => {
                  return deleteMailFiles([id]);
                }}
              />
            ) : activeMailId ? (
              <MailDetail
                mail={activeMail}
                currentUserEmail={currentUserEmail}
                currentUserName={currentUserName}
                currentUserAvatarUrl={currentUserAvatarUrl}
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
                    try {
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
                    } catch {
                      await recoverMutationState("No se pudo actualizar la etiqueta del mensaje.");
                    }
                  })();
                }}
                detailData={activeMailDetail}
                onComposePrefill={(payload) =>
                  openCompose({
                    to: payload.to,
                    cc: payload.cc,
                    bcc: payload.bcc,
                    subject: payload.subject,
                    body: payload.body,
                    bodyJson: payload.bodyJson,
                    attachmentIds: payload.attachmentIds,
                    mode: payload.mode,
                    parentMessageId: payload.parentMessageId,
                  })
                }
                onInlineComposeSend={sendInlineCompose}
                onCreateInlineDraft={createInlineDraft}
                onUploadAttachment={async ({ file, draftId, kind }) => uploadAttachment({ file, draftId, kind })}
                onDeleteAttachment={async (attachmentId) => {
                  await deleteRemoteAttachment(attachmentId);
                }}
                onExecuteAction={executeThreadAction}
                onSendScheduledNow={(id) => {
                  void sendScheduledNowById(id);
                }}
                onRescheduleScheduled={(id) => openScheduledDateModal(id)}
                onCancelScheduled={(id) => {
                  void cancelScheduledById(id);
                }}
                formatFullDate={formatFullDate}
                initialsOf={initialsOf}
                avatarColor={avatarColor}
              />
            ) : (
              <>
                <MailToolbar
                  total={currentTotal}
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
                  onSnooze={(id, snoozedUntil) => {
                    if (folder === "snoozed") {
                      void unsnooze(id);
                      return;
                    }
                    if (snoozedUntil) {
                      void applySnoozeById(id, snoozedUntil);
                      return;
                    }
                    openSnoozeDateModal(id);
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
        onModeChange={(composeId, mode) =>
          updateComposeDraft(composeId, {
            mode,
            to: mode === "forward" ? "" : composeDraftsRef.current.find((item) => item.id === composeId)?.to ?? "",
            cc: mode === "forward" ? "" : composeDraftsRef.current.find((item) => item.id === composeId)?.cc ?? "",
            bcc: mode === "forward" ? "" : composeDraftsRef.current.find((item) => item.id === composeId)?.bcc ?? "",
          })
        }
        onToggleLabel={toggleComposeLabel}
        onResolveDraftId={resolveComposeDraftId}
        onAttachmentUploaded={onComposeAttachmentUploaded}
        onAttachmentRemoved={onComposeAttachmentRemoved}
        onUploadAttachment={async ({ file, draftId, kind }) => uploadAttachment({ file, draftId, kind })}
        onDeleteAttachment={async (attachmentId) => {
          await deleteRemoteAttachment(attachmentId);
        }}
        onDiscard={(composeId) => {
          void discardComposeDraft(composeId);
        }}
        onSend={sendCompose}
        onSchedule={scheduleCompose}
      />

      <SnoozeDateTimeModal
        open={snoozeDateModalOpen}
        value={customSnoozeDate}
        onClose={() => {
          setSnoozeDateModalOpen(false);
          setSnoozeTargetId(null);
        }}
        onSave={(date) => {
          setCustomSnoozeDate(date);
          void applyCustomSnooze(date);
        }}
      />

      <SnoozeDateTimeModal
        open={scheduledDateModalOpen}
        value={customScheduledDate}
        onClose={() => {
          setScheduledDateModalOpen(false);
          setScheduledTargetId(null);
        }}
        onSave={(date) => {
          setCustomScheduledDate(date);
          void applyCustomSchedule(date);
        }}
      />

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



