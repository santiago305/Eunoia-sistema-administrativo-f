import { useCallback, useEffect, useState } from "react";
import type { MailLabelItem } from "../types/message.types";
import { createMailLabel, listMailLabels } from "../services/messages.service";

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

  const createLabel = useCallback(async (name: string, color: string) => {
    const created = await createMailLabel({ name, color });
    setItems((prev) => [...prev, created]);
    return created;
  }, []);

  return { items, loading, reload, createLabel };
}

