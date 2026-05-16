import { useCallback, useEffect, useRef, useState } from "react";
import { archiveMessage, deleteMessage, listMessages, markMessageAsRead, markMessageAsUnread, restoreMessage, snoozeMessage, starMessage, unarchiveMessage, unsnoozeMessage, unstarMessage } from "../services/messages.service";
import type { InboxItem, MessageFolder, SentMessageItem } from "../types/message.types";

export function useMessagesV2(params: {
  folder: MessageFolder;
  originModule?: string;
  labelId?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const { folder, originModule, labelId, q, page, limit } = params;
  const [items, setItems] = useState<Array<InboxItem | SentMessageItem>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const reload = useCallback(async () => {
    const requestSeq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await listMessages({ view: folder, originModule, labelId, q, page, limit });
      if (requestSeq !== requestSeqRef.current) return;
      console.log("[mail:list] response", {
        view: folder,
        page,
        limit,
        total: response.total,
        items: Array.isArray(response.items) ? response.items.length : 0,
      });
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
  }, [folder, originModule, labelId, q, page, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const markInboxRowAsRead = useCallback(async (recipientId: string) => {
    await markMessageAsRead(recipientId);
    setItems((prev) =>
      prev.map((item) =>
        "recipient" in item && item.recipient.id === recipientId
          ? { ...item, recipient: { ...item.recipient, readAt: new Date().toISOString() } }
          : item,
      ),
    );
  }, []);

  const markInboxRowAsUnread = useCallback(async (recipientId: string) => {
    await markMessageAsUnread(recipientId);
    setItems((prev) =>
      prev.map((item) =>
        "recipient" in item && item.recipient.id === recipientId
          ? { ...item, recipient: { ...item.recipient, readAt: null } }
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
    setItems((prev) => prev.filter((item) => !("recipient" in item && item.recipient.id === recipientId)));
  }, []);

  const restoreInboxRow = useCallback(async (recipientId: string) => {
    await restoreMessage(recipientId);
    await reload();
  }, [reload]);

  const archiveInboxRow = useCallback(async (recipientId: string) => {
    await archiveMessage(recipientId);
    await reload();
  }, [reload]);

  const unarchiveInboxRow = useCallback(async (recipientId: string) => {
    await unarchiveMessage(recipientId);
    await reload();
  }, [reload]);

  const snoozeInboxRow = useCallback(async (recipientId: string, snoozedUntil: string) => {
    await snoozeMessage(recipientId, snoozedUntil);
    await reload();
  }, [reload]);

  const unsnoozeInboxRow = useCallback(async (recipientId: string) => {
    await unsnoozeMessage(recipientId);
    await reload();
  }, [reload]);

  return {
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
  };
}
