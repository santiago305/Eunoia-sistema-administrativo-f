import { useCallback, useEffect, useRef, useState } from "react";
import { archiveMessage, deleteMessage, listMessages, markMessageAsRead, markMessageAsUnread, restoreMessage, snoozeMessage, starMessage, unarchiveMessage, unsnoozeMessage, unstarMessage } from "../services/messages.service";
import type { InboxItem, MessageFolder, SentMessageItem } from "../types/message.types";
import type { MessageCreatedRealtimePayload } from "../types/realtime.types";

export function useMessagesV2(params: {
  folder: MessageFolder;
  originModule?: string;
  labelId?: string;
  q?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  const { folder, originModule, labelId, q, page, limit, enabled = true } = params;
  const [items, setItems] = useState<Array<InboxItem | SentMessageItem>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setTotal(0);
      setError(null);
      setLoading(false);
      return;
    }
    const requestSeq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await listMessages({ view: folder, originModule, labelId, q, page, limit });
      if (requestSeq !== requestSeqRef.current) return;
      setItems(response.items);
      setTotal(response.total);
    } catch {
      if (requestSeq !== requestSeqRef.current) return;
      setError("No se pudieron cargar los mensajes.");
      setItems([]);
      setTotal(0);
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, folder, originModule, labelId, q, page, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const removeRecipientFromCurrentList = useCallback((recipientId: string) => {
    let removed = false;
    setItems((prev) => {
      const next = prev.filter((item) => {
        if (!("recipient" in item)) return true;
        const shouldKeep = item.recipient.id !== recipientId;
        if (!shouldKeep) removed = true;
        return shouldKeep;
      });
      return next;
    });
    if (removed) {
      setTotal((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const removeMessageFromCurrentList = useCallback((messageId: string) => {
    let removed = false;
    setItems((prev) => {
      const next = prev.filter((item) => {
        if ("recipient" in item) {
          const currentMessageId = item.recipient.messageId || item.message?.id;
          const shouldKeep = currentMessageId !== messageId;
          if (!shouldKeep) removed = true;
          return shouldKeep;
        }
        const shouldKeep = item.id !== messageId;
        if (!shouldKeep) removed = true;
        return shouldKeep;
      });
      return next;
    });
    if (removed) {
      setTotal((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const markInboxRowAsRead = useCallback(async (recipientId: string) => {
    await markMessageAsRead(recipientId);
    setItems((prev) =>
      prev.map((item) =>
        "recipient" in item && item.recipient.id === recipientId
          ? {
              ...item,
              recipient: { ...item.recipient, readAt: new Date().toISOString() },
              message: item.message ? { ...item.message, threadUnreadCount: 0 } : item.message,
            }
          : item,
      ),
    );
  }, []);

  const setInboxRowReadLocally = useCallback((recipientId: string, read: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        "recipient" in item && item.recipient.id === recipientId
          ? {
              ...item,
              recipient: { ...item.recipient, readAt: read ? new Date().toISOString() : null },
              message: item.message
                ? { ...item.message, threadUnreadCount: read ? 0 : Math.max(item.message.threadUnreadCount ?? 0, 1) }
                : item.message,
            }
          : item,
      ),
    );
  }, []);

  const markInboxRowAsUnread = useCallback(async (recipientId: string) => {
    await markMessageAsUnread(recipientId);
    setItems((prev) =>
      prev.map((item) =>
        "recipient" in item && item.recipient.id === recipientId
          ? {
              ...item,
              recipient: { ...item.recipient, readAt: null },
              message: item.message
                ? { ...item.message, threadUnreadCount: Math.max(item.message.threadUnreadCount ?? 0, 1) }
                : item.message,
            }
          : item,
      ),
    );
  }, []);

  const starInboxRow = useCallback(async (recipientId: string, value: boolean) => {
    if (value) await starMessage(recipientId);
    else await unstarMessage(recipientId);
    setItems((prev) =>
      prev.map((item) =>
        "recipient" in item && item.recipient.id === recipientId
          ? { ...item, recipient: { ...item.recipient, starredAt: value ? new Date().toISOString() : null } }
          : item,
      ),
    );
  }, []);

  const deleteInboxRow = useCallback(async (recipientId: string) => {
    await deleteMessage(recipientId);
    removeRecipientFromCurrentList(recipientId);
  }, [removeRecipientFromCurrentList]);

  const restoreInboxRow = useCallback(async (recipientId: string) => {
    await restoreMessage(recipientId);
    if (folder === "trash") {
      removeRecipientFromCurrentList(recipientId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        "recipient" in item && item.recipient.id === recipientId
          ? { ...item, recipient: { ...item.recipient, deletedAt: null } }
          : item,
      ),
    );
  }, [folder, removeRecipientFromCurrentList]);

  const archiveInboxRow = useCallback(async (recipientId: string) => {
    await archiveMessage(recipientId);
    if (folder === "inbox") {
      removeRecipientFromCurrentList(recipientId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        "recipient" in item && item.recipient.id === recipientId
          ? { ...item, recipient: { ...item.recipient, updatedAt: new Date().toISOString() } }
          : item,
      ),
    );
  }, [folder, removeRecipientFromCurrentList]);

  const unarchiveInboxRow = useCallback(async (recipientId: string) => {
    await unarchiveMessage(recipientId);
    if (folder === "archived") {
      removeRecipientFromCurrentList(recipientId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        "recipient" in item && item.recipient.id === recipientId
          ? { ...item, recipient: { ...item.recipient, updatedAt: new Date().toISOString() } }
          : item,
      ),
    );
  }, [folder, removeRecipientFromCurrentList]);

  const snoozeInboxRow = useCallback(async (recipientId: string, snoozedUntil: string) => {
    await snoozeMessage(recipientId, snoozedUntil);
    if (folder !== "snoozed" && folder !== "all") {
      removeRecipientFromCurrentList(recipientId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        "recipient" in item && item.recipient.id === recipientId
          ? { ...item, recipient: { ...item.recipient, updatedAt: new Date().toISOString() } }
          : item,
      ),
    );
  }, [folder, removeRecipientFromCurrentList]);

  const unsnoozeInboxRow = useCallback(async (recipientId: string) => {
    await unsnoozeMessage(recipientId);
    if (folder === "snoozed") {
      removeRecipientFromCurrentList(recipientId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        "recipient" in item && item.recipient.id === recipientId
          ? { ...item, recipient: { ...item.recipient, updatedAt: new Date().toISOString() } }
          : item,
      ),
    );
  }, [folder, removeRecipientFromCurrentList]);

  const insertRealtimeInboxItem = useCallback((payload: MessageCreatedRealtimePayload) => {
    const recipient = payload.recipient;
    const message = payload.message;
    if (!recipient || !message) return false;

    const now = Date.now();
    const snoozedUntilTs = recipient.snoozedUntil ? new Date(recipient.snoozedUntil).getTime() : null;
    const isSnoozedNow = typeof snoozedUntilTs === "number" && Number.isFinite(snoozedUntilTs) && snoozedUntilTs > now;
    const isDeleted = Boolean(recipient.deletedAt);
    const isArchived = Boolean(recipient.isArchived);
    const isInInbox = recipient.isInInbox !== false;
    const isStarred = Boolean(recipient.starredAt);
    const hasLabel = !labelId || (payload.labels ?? []).some((label) => label.id === labelId);
    const query = (q ?? "").trim().toLowerCase();
    const queryHit = !query
      || message.subject?.toLowerCase().includes(query)
      || message.bodyText?.toLowerCase().includes(query)
      || payload.sender?.name?.toLowerCase().includes(query)
      || payload.sender?.email?.toLowerCase().includes(query);

    const viewMatch = (() => {
      if (!hasLabel || !queryHit) return false;
      if (folder === "inbox") return !isDeleted && !isArchived && !isSnoozedNow && isInInbox;
      if (folder === "all") return !isDeleted;
      if (folder === "trash") return isDeleted;
      if (folder === "starred") return !isDeleted && !isArchived && !isSnoozedNow && isStarred;
      if (folder === "archived") return !isDeleted && isArchived;
      if (folder === "snoozed") return !isDeleted && isSnoozedNow;
      if (folder === "sent" || folder === "drafts") return false;
      return false;
    })();

    if (!viewMatch) return false;

    const incomingThreadUnreadCount = message.threadUnreadCount ?? (recipient.readAt ? 0 : 1);
    const nextItem: InboxItem = {
      recipient: {
        id: recipient.id,
        messageId: recipient.messageId,
        recipientUserId: recipient.recipientUserId,
        recipientEmail: recipient.recipientEmail,
        recipientType: recipient.recipientType,
        readAt: recipient.readAt,
        starredAt: recipient.starredAt,
        deletedAt: recipient.deletedAt,
        deliveredAt: recipient.deliveredAt,
        createdAt: recipient.createdAt,
        updatedAt: recipient.updatedAt,
      },
      message: {
        ...message,
        threadUnreadCount: incomingThreadUnreadCount,
      },
      sender: payload.sender ?? null,
      labels: payload.labels ?? [],
    };

    const isThreadReply = Boolean(message.threadId && message.parentMessageId);
    if ((page ?? 1) !== 1) {
      if (!isThreadReply) setTotal((prev) => prev + 1);
      return true;
    }

    setItems((prev) => {
      const sameRecipientIndex = prev.findIndex((item) => "recipient" in item && item.recipient.id === recipient.id);
      const sameThreadIndex = message.threadId
        ? prev.findIndex((item) => "recipient" in item && item.message?.threadId === message.threadId)
        : -1;
      const existingIndex = sameThreadIndex >= 0 ? sameThreadIndex : sameRecipientIndex;

      if (existingIndex >= 0) {
        const existingItem = prev[existingIndex];
        const previousUnreadCount = "recipient" in existingItem
          ? existingItem.message?.threadUnreadCount ?? (existingItem.recipient.readAt ? 0 : 1)
          : 0;
        const shouldIncrementThreadUnread = sameThreadIndex >= 0 && sameRecipientIndex < 0 && !recipient.readAt;
        const threadUnreadCount = message.threadUnreadCount
          ?? (shouldIncrementThreadUnread ? previousUnreadCount + 1 : incomingThreadUnreadCount);
        const mergedItem: InboxItem = {
          ...nextItem,
          message: nextItem.message ? { ...nextItem.message, threadUnreadCount } : null,
        };
        const next = [mergedItem, ...prev.filter((_, index) => index !== existingIndex)];
        if (typeof limit === "number" && limit > 0 && next.length > limit) {
          return next.slice(0, limit);
        }
        return next;
      }

      setTotal((current) => current + 1);
      const next = [nextItem, ...prev];
      if (typeof limit === "number" && limit > 0 && next.length > limit) {
        return next.slice(0, limit);
      }
      return next;
    });

    return true;
  }, [folder, labelId, limit, page, q]);

  return {
    items,
    total,
    loading,
    error,
    reload,
    markInboxRowAsRead,
    markInboxRowAsUnread,
    setInboxRowReadLocally,
    starInboxRow,
    deleteInboxRow,
    restoreInboxRow,
    archiveInboxRow,
    unarchiveInboxRow,
    snoozeInboxRow,
    unsnoozeInboxRow,
    removeRecipientRowLocally: removeRecipientFromCurrentList,
    removeMessageRowLocally: removeMessageFromCurrentList,
    insertRealtimeInboxItem,
  };
}
