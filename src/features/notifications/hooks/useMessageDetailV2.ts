import { useCallback, useEffect, useState } from "react";
import { getMessageDetail, markMessageAsRead, forwardMessage, replyMessage } from "../services/messages.service";
import { NOTIFICATION_WINDOW_EVENTS } from "../constants/notification-events.constants";

export function useMessageDetailV2(id?: string) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const emitRefresh = useCallback(() => {
    window.dispatchEvent(new Event(NOTIFICATION_WINDOW_EVENTS.refresh));
  }, []);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await getMessageDetail(id);
    setItem(data);
    setLoading(false);
    emitRefresh();
  }, [emitRefresh, id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const markRead = useCallback(async () => {
    if (!id) return;
    await markMessageAsRead(id);
    await reload();
    emitRefresh();
  }, [emitRefresh, id, reload]);

  const reply = useCallback(
    async (payload: { bodyHtml: string; to?: string[]; cc?: string[]; bcc?: string[] }) => {
      if (!id) return;
      await replyMessage(id, payload);
      await reload();
      emitRefresh();
    },
    [emitRefresh, id, reload],
  );

  const forward = useCallback(
    async (payload: { bodyHtml: string; to: string[]; cc?: string[]; bcc?: string[] }) => {
      if (!id) return;
      await forwardMessage(id, payload);
      await reload();
      emitRefresh();
    },
    [emitRefresh, id, reload],
  );

  return { item, loading, reload, markRead, reply, forward };
}
