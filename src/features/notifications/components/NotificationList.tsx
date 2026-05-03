import { Link } from 'react-router-dom';
import type { NotificationRecipientItem } from '../types/notification.types';
import { RoutesPaths } from '@/routes/config/routesPaths';

interface Props {
  items: NotificationRecipientItem[];
}

export default function NotificationList({ items }: Props) {
  if (!items.length) {
    return <div className="rounded-md border p-4 text-sm text-muted-foreground">No tienes notificaciones.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.recipientId}
          to={RoutesPaths.notificationDetail.replace(':id', item.recipientId)}
          className="block rounded-md border p-4 hover:bg-muted/30"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{item.notification.title}</h3>
            <span className="text-xs text-muted-foreground">{item.status}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{item.notification.message}</p>
        </Link>
      ))}
    </div>
  );
}
