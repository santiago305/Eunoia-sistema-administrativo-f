import { Link } from 'react-router-dom';
import type { NotificationRecipientItem } from '../types/notification.types';
import { RoutesPaths } from '@/routes/config/routesPaths';
import { Button } from '@/shared/components/ui/button';
import { getNotificationApproveUrl, getNotificationViewUrl } from '../utils/notificationActions';

interface Props {
  items: NotificationRecipientItem[];
  onMarkAsRead?: (recipientId: string) => Promise<void>;
}

export default function NotificationList({ items, onMarkAsRead }: Props) {
  if (!items.length) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">No tienes notificaciones.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.recipientId} className="rounded-md border p-4 hover:bg-muted/30">
          <div className="flex items-center justify-between">
            <Link to={RoutesPaths.notificationDetail.replace(':id', item.recipientId)} className="font-semibold hover:underline">
              {item.notification.title}
            </Link>
            <span className="text-xs text-muted-foreground">{item.status}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{item.notification.message}</p>
          <div className="mt-3 flex gap-2">
            {getNotificationViewUrl(item) ? (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (onMarkAsRead) await onMarkAsRead(item.recipientId);
                  window.location.href = getNotificationViewUrl(item)!;
                }}
              >
                Ver
              </Button>
            ) : null}
            {getNotificationApproveUrl(item) ? (
              <Button
                type="button"
                onClick={async () => {
                  if (onMarkAsRead) await onMarkAsRead(item.recipientId);
                  window.location.href = getNotificationApproveUrl(item)!;
                }}
              >
                Aprobar
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
