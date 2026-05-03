import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RoutesPaths } from '@/routes/config/routesPaths';
import { IconBell } from '@/shared/components/components/dashboard/icons';
import { useUnreadNotificationsCount } from '../hooks/useUnreadNotificationsCount';
import { Popover } from '@/shared/components/modales/Popover';
import { listMyNotifications, markNotificationAsSeen } from '@/shared/services/notificationService';
import type { NotificationPriority, NotificationRecipientItem } from '../types/notification.types';
import { NOTIFICATION_WINDOW_EVENTS } from '../constants/notification-events.constants';
import { formatRelativeTime } from '@/shared/utils/relativeTime';

interface NotificationBellProps {
  mobile?: boolean;
}

export default function NotificationBell({ mobile = false }: NotificationBellProps) {
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRecipientItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { count } = useUnreadNotificationsCount();
  const showBadge = count.unread > 0;
  const buttonClassName = useMemo(
    () =>
      mobile
        ? 'fixed left-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/95 shadow-sm backdrop-blur sm:hidden'
        : 'fixed right-4 top-4 z-20 hidden h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/95 shadow-sm backdrop-blur sm:inline-flex',
    [mobile],
  );

  const loadLatest = useCallback(async () => {
    setLoading(true);
    const latest = await listMyNotifications({ limit: 10 });
    setItems(latest);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadLatest();
  }, [open, loadLatest]);

  useEffect(() => {
    const handleRefresh = () => {
      if (open) {
        void loadLatest();
      }
    };

    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);
    return () => {
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);
    };
  }, [open, loadLatest]);

  const handleOpenDetail = (recipientId: string) => {
    void (async () => {
      try {
        await markNotificationAsSeen(recipientId);
      } finally {
        setOpen(false);
        navigate(RoutesPaths.notificationDetail.replace(':id', recipientId));
      }
    })();
  };

  const getPriorityClassName = (priority: NotificationPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'URGENT':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'LOW':
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="Notificaciones"
        className={buttonClassName}
        onClick={() => {
          setOpen((prev) => !prev);
        }}
      >
        <IconBell className="text-foreground" />
        {showBadge ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {count.unread > 99 ? '99+' : count.unread}
          </span>
        ) : null}
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        placement={mobile ? 'bottom-start' : 'bottom-end'}
        offset={10}
        title="Notificaciones"
        description="Ultimas 10 notificaciones"
        className="w-[360px] max-w-[92vw]"
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="p-3 text-sm text-muted-foreground">Cargando...</div>
        ) : items.length ? (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <button
                key={item.recipientId}
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-muted/40"
                onClick={() => handleOpenDetail(item.recipientId)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{item.notification.title}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {item.notification.message}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${getPriorityClassName(item.notification.priority)}`}
                  >
                    {item.notification.priority}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(item.notification.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3 text-sm text-muted-foreground">No tienes notificaciones.</div>
        )}

        <div className="border-t border-border p-2">
          <Link
            to={RoutesPaths.notifications}
            className="block rounded-md px-2 py-1.5 text-center text-sm font-medium text-primary hover:bg-muted/40"
            onClick={() => setOpen(false)}
          >
            Ver mas
          </Link>
        </div>
      </Popover>
    </>
  );
}
