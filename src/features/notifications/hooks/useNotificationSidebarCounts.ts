import { useCallback, useEffect, useState } from "react";
import { listMessages } from "../services/messages.service";
import { listDrafts } from "../services/drafts.service";
import type { MessageFolder } from "../types/message.types";
import { useAuth } from "@/shared/hooks/useAuth";
import { NOTIFICATION_WINDOW_EVENTS } from "../constants/notification-events.constants";
import { listMailLabels } from "../services/messages.service";

type SidebarCounts = {
  inbox: number;
  starred: number;
  sent: number | undefined;
  drafts: number;
  trash: number;
  archived: number;
  snoozed: number;
  labelUnreadById: Record<string, number>;
};

const INITIAL_COUNTS: SidebarCounts = {
  inbox: 0,
  starred: 0,
  sent: 0,
  drafts: 0,
  trash: 0,
  archived: 0,
  snoozed: 0,
  labelUnreadById: {},
};

export function useNotificationSidebarCounts() {
  const { isAuthenticated, authChecked, userId } = useAuth();
  const [counts, setCounts] = useState<SidebarCounts>(INITIAL_COUNTS);

  const reload = useCallback(async () => {
    if (!authChecked || !isAuthenticated || !userId) {
      setCounts(INITIAL_COUNTS);
      return;
    }

    try {
      const folders: MessageFolder[] = ["inbox", "starred", "trash", "archived", "snoozed"];
      const [inbox, starred, trash, archived, snoozed, drafts, labels] = await Promise.all([
        listMessages({ folder: folders[0], read: false, page: 1, limit: 1 }),
        listMessages({ folder: folders[1], read: false, page: 1, limit: 1 }),
        listMessages({ folder: folders[2], read: false, page: 1, limit: 1 }),
        listMessages({ folder: folders[3], read: false, page: 1, limit: 1 }),
        listMessages({ folder: folders[4], read: false, page: 1, limit: 1 }),
        listDrafts(),
        listMailLabels(),
      ]);

      const labelUnreadById: Record<string, number> = {};
      await Promise.all(
        (labels ?? []).map(async (label) => {
          const result = await listMessages(
            label.type === "MODULE"
              ? { folder: "inbox", read: false, originModule: label.key, page: 1, limit: 1 }
              : { folder: "inbox", read: false, labelId: label.id, page: 1, limit: 1 },
          );
          labelUnreadById[label.id] = result.total ?? 0;
        }),
      );

      setCounts({
        inbox: inbox.total ?? 0,
        starred: starred.total ?? 0,
        sent: undefined,
        trash: trash.total ?? 0,
        drafts: drafts.length ?? 0,
        archived: archived.total ?? 0,
        snoozed: snoozed.total ?? 0,
        labelUnreadById,
      });
    } catch {
      // Mantiene el ultimo estado valido para no congelar el sidebar en 0.
    }
  }, [authChecked, isAuthenticated, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handleRefresh = () => void reload();
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);
    window.addEventListener("focus", handleRefresh);
    return () => {
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.messagesRefresh, handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [reload]);

  return counts;
}
