import NotificationDetail from '@/features/notifications/components/NotificationDetail';
import { useNotificationDetail } from '@/features/notifications/hooks/useNotificationDetail';
import { useParams } from 'react-router-dom';

export default function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { item, loading, markAsRead } = useNotificationDetail(id);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando detalle...</div>;
  }

  if (!item) {
    return <div className="text-sm text-muted-foreground">No se encontro la notificacion.</div>;
  }

  return <NotificationDetail item={item} onMarkAsRead={markAsRead} />;
}
