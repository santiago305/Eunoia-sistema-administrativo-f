import { describe, expect, it } from 'vitest';
import { buildSaleOrderRepairFeedback } from './saleOrderRepairFeedback';

const base = {
  saleOrderId: 'order-1',
  reason: 'workflow-reconciled',
  workflow: { fromId: 'wf-1', toId: 'wf-1', revision: 2 },
  state: {
    fromId: 'state-programmed',
    fromName: 'Programado',
    toId: 'state-coordinated',
    toName: 'Coordinado',
  },
  stock: { from: 'CONSUMED' as const, to: 'NONE' as const, actions: ['RESTORE_STOCK'] },
};

describe('buildSaleOrderRepairFeedback', () => {
  it('describes the state, stock and synchronization changes', () => {
    expect(
      buildSaleOrderRepairFeedback({
        ...base,
        repaired: true,
        changes: {
          workflow: true,
          state: true,
          warehouse: false,
          markers: true,
          stock: true,
        },
      }),
    ).toBe(
      'Pedido reparado: estado Programado \u2192 Coordinado; stock consumido \u2192 sin reserva; flujo actualizado a la revisión 2; marcadores sincronizados.',
    );
  });

  it('reports a no-op without claiming a repair', () => {
    expect(
      buildSaleOrderRepairFeedback({
        ...base,
        repaired: false,
        reason: 'already-consistent',
      }),
    ).toBe('Pedido correcto: no se realizaron cambios.');
  });
});
