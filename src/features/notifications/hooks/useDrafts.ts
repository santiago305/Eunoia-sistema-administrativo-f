import { useCallback, useEffect, useState } from "react";
import { listDrafts } from "../services/drafts.service";
import type { DraftMessageItem } from "../types/message.types";

export function useDrafts(enabled = true) {
  const [items, setItems] = useState<DraftMessageItem[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    const data = await listDrafts();
    setItems(data);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, reload };
}
