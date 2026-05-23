import { useCallback, useEffect, useState } from "react";
import { getMessageDetail, markMessageAsRead, forwardMessage, replyMessage } from "../services/messages.service";

export function useMessageDetailV2(id?: string) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await getMessageDetail(id);
    setItem(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const markRead = useCallback(async () => {
    if (!id) return;
    await markMessageAsRead(id);
    await reload();
  }, [id, reload]);

  const reply = useCallback(
    async (payload: { bodyHtml: string; to?: string[]; cc?: string[]; bcc?: string[] }) => {
      if (!id) return;
      await replyMessage(id, payload);
      await reload();
    },
    [id, reload],
  );

  const forward = useCallback(
    async (payload: { bodyHtml: string; to: string[]; cc?: string[]; bcc?: string[] }) => {
      if (!id) return;
      await forwardMessage(id, payload);
      await reload();
    },
    [id, reload],
  );

  return { item, loading, reload, markRead, reply, forward };
}

