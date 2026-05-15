import { useCallback, useEffect, useState } from "react";
import { getNotificationModules } from "../services/messages.service";
import type { NotificationModuleItem } from "../types/message.types";

export function useMailModules() {
  const [modules, setModules] = useState<NotificationModuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotificationModules();
      setModules(data);
    } catch {
      setModules([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { modules, loading, reload };
}

