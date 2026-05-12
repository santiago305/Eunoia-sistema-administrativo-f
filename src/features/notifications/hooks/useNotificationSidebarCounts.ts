import { useEffect, useState } from "react";
import { listMessages } from "../services/messages.service";
import { listDrafts } from "../services/drafts.service";
import type { MessageFolder } from "../types/message.types";

type SidebarCounts = {
  inbox: number;
  starred: number;
  sent: number;
  drafts: number;
  trash: number;
};

const INITIAL_COUNTS: SidebarCounts = {
  inbox: 0,
  starred: 0,
  sent: 0,
  drafts: 0,
  trash: 0,
};

export function useNotificationSidebarCounts() {
  const [counts, setCounts] = useState<SidebarCounts>(INITIAL_COUNTS);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const folders: MessageFolder[] = ["inbox", "starred", "sent", "trash"];
        const [inbox, starred, sent, trash, drafts] = await Promise.all([
          listMessages({ folder: folders[0], page: 1, limit: 1 }),
          listMessages({ folder: folders[1], page: 1, limit: 1 }),
          listMessages({ folder: folders[2], page: 1, limit: 1 }),
          listMessages({ folder: folders[3], page: 1, limit: 1 }),
          listDrafts(),
        ]);

        if (!mounted) return;
        setCounts({
          inbox: inbox.total ?? 0,
          starred: starred.total ?? 0,
          sent: sent.total ?? 0,
          trash: trash.total ?? 0,
          drafts: drafts.length ?? 0,
        });
      } catch {
        if (!mounted) return;
        setCounts(INITIAL_COUNTS);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return counts;
}

