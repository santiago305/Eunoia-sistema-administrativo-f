import { useNavigate } from 'react-router-dom';
import type { NotificationRecipientItem } from '../types/notification.types';
import { Button } from '@/shared/components/ui/button';

interface Props {
  item: NotificationRecipientItem;
  onMarkAsRead: () => Promise<void>;
}

export default function NotificationDetail({ item, onMarkAsRead }: Props) {
  const navigate = useNavigate();

  return (
    <div className="rounded-md border p-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{item.notification.title}</h1>
        <span className="text-xs text-muted-foreground">{item.status}</span>
      </div>

      <p className="text-sm text-muted-foreground">{item.notification.message}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void onMarkAsRead()}>
          Marcar como leida
        </Button>

        {item.notification.actionUrl && item.notification.actionLabel ? (
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await onMarkAsRead();
              navigate(item.notification.actionUrl!);
            }}
          >
            {item.notification.actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
