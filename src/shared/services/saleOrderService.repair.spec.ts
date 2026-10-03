import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repairSaleOrderWorkflow } from './saleOrderService';

vi.mock('@/shared/common/utils/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import axiosInstance from '@/shared/common/utils/axios';

describe('repairSaleOrderWorkflow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the repair endpoint for the selected order', async () => {
    const result = {
      repaired: true,
      reason: 'workflow-reconciled',
      saleOrderId: 'order-1',
      workflow: { fromId: 'wf-1', toId: 'wf-1', revision: 2 },
      state: { fromId: 'programmed', fromName: 'Programado', toId: 'coordinated', toName: 'Coordinado' },
      stock: { from: 'CONSUMED' as const, to: 'NONE' as const, actions: ['RESTORE_STOCK'] },
    };
    (axiosInstance.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: result });

    await expect(repairSaleOrderWorkflow('order-1')).resolves.toEqual(result);
    expect(axiosInstance.post).toHaveBeenCalledWith('/sale-orders/order-1/repair-workflow');
  });
});
