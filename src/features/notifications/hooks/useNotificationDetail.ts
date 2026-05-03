import { useCallback, useEffect, useState } from 'react';
import type { NotificationRecipientItem } from '../types/notification.types';
import {
  getNotificationDetail,
  markNotificationAsRead,
  markNotificationAsSeen,
} from '@/shared/services/notificationService';

export function useNotificationDetail(recipientId?: string) {
  const [item, setItem] = useState<NotificationRecipientItem | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!recipientId) return;
    setLoading(true);
    const detail = await getNotificationDetail(recipientId);
    setItem(detail);
    const seen = await markNotificationAsSeen(recipientId);
    setItem(seen);
    setLoading(false);
  }, [recipientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markAsRead = useCallback(async () => {
    if (!recipientId) return;
    const read = await markNotificationAsRead(recipientId);
    setItem(read);
  }, [recipientId]);

  return {
    item,
    loading,
    markAsRead,
  };
}
