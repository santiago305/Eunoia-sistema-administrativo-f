import NotificationList from '@/features/notifications/components/NotificationList';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { Button } from '@/shared/components/ui/button';
import { sendDevNotificationToMe } from '@/shared/services/notificationService';

export default function NotificationsPage() {
  const { items, count, loading, markAllAsRead } = useNotifications();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notificaciones</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">No leidas: {count.unread}</span>
          <Button type="button" variant="secondary" onClick={() => void sendDevNotificationToMe()}>
            Probar realtime
          </Button>
          <Button type="button" variant="outline" onClick={() => void markAllAsRead()}>
            Marcar todas como leidas
          </Button>
        </div>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Cargando...</div> : <NotificationList items={items} />}
    </div>
  );
}
