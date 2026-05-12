import { useCallback, useEffect, useState } from "react";
import type { MailLabelItem } from "../types/message.types";
import { createMailLabel, deleteMailLabel, listMailLabels } from "../services/messages.service";

const MAIL_LABELS_UPDATED_EVENT = "mail-labels:updated";

export function useMailLabels(enabled = true) {
  const [items, setItems] = useState<MailLabelItem[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const data = await listMailLabels();
    setItems(data ?? []);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handleLabelsUpdated = () => {
      void reload();
    };
    window.addEventListener(MAIL_LABELS_UPDATED_EVENT, handleLabelsUpdated);
    return () => {
      window.removeEventListener(MAIL_LABELS_UPDATED_EVENT, handleLabelsUpdated);
    };
  }, [reload]);

  const createLabel = useCallback(async (name: string, color: string) => {
    const created = await createMailLabel({ name, color });
    setItems((prev) => {
      const withoutSame = prev.filter((item) => item.id !== created.id);
      return [...withoutSame, created];
    });
    window.dispatchEvent(new Event(MAIL_LABELS_UPDATED_EVENT));
    return created;
  }, []);

  const deleteLabel = useCallback(async (id: string) => {
    await deleteMailLabel(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    window.dispatchEvent(new Event(MAIL_LABELS_UPDATED_EVENT));
  }, []);

  return { items, loading, reload, createLabel, deleteLabel };
}
