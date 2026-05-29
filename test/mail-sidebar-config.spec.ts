import { describe, expect, it } from 'vitest';
import { getMailSidebarItems } from '@/shared/config/mailSidebarConfig';

const labels = [
  { id: 'l1', ownerUserId: 'u1', key: 'purchases', name: 'Compras', type: 'MODULE', color: '#111', icon: null, isVisible: true, sortOrder: 1 },
  { id: 'l2', ownerUserId: 'u1', key: 'urgent', name: 'Urgente', type: 'CUSTOM', color: '#f00', icon: null, isVisible: true, sortOrder: 2 },
] as any;

describe('mail sidebar config', () => {
  it('includes inbox route as default all-messages entry point', () => {
    const items = getMailSidebarItems();
    const inbox = items.find((item) => item.label === 'Recibidos');
    expect(inbox?.href).toBe('/email/inbox');
  });

  it('shows only custom labels in collapsed More section', () => {
    const items = getMailSidebarItems({ labelUnreadById: { l2: 3 } } as any, labels, true);
    const more = items.find((item) => item.label === 'Mas');
    const children = more?.children ?? [];

    expect(children.some((child) => child.label === 'Urgente')).toBe(true);
    expect(children.some((child) => child.label === 'Compras')).toBe(false);
  });
});
