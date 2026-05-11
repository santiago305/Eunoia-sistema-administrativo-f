import { useCallback, useEffect, useState } from "react";
import { deleteMessage, listMessages, markMessageAsRead, restoreMessage, starMessage, unstarMessage } from "../services/messages.service";
import type { InboxItem, MessageFolder, SentMessageItem } from "../types/message.types";

export function useMessagesV2(params: {
  folder: MessageFolder;
  originModule?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const { folder, originModule, q, page, limit } = params;
  const [items, setItems] = useState<Array<InboxItem | SentMessageItem>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listMessages({ folder, originModule, q, page, limit });
      setItems(response.items);
      setTotal(response.total);
    } catch {
      setError("No se pudieron cargar los mensajes.");
    }
    setLoading(false);
  }, [folder, originModule, q, page, limit]);

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

  return { items, total, loading, error, reload, markInboxRowAsRead, starInboxRow, deleteInboxRow, restoreInboxRow };
}
