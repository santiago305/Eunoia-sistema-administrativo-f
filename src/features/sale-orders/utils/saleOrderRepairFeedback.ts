import type { RepairSaleOrderWorkflowResponse } from '@/shared/services/saleOrderService';

export function buildSaleOrderRepairFeedback(
  result: RepairSaleOrderWorkflowResponse,
): string {
  if (!result.repaired) return 'Pedido correcto: no se realizaron cambios.';
  const stockLabel: Record<RepairSaleOrderWorkflowResponse['stock']['from'], string> = {
    NONE: 'sin reserva',
    RESERVED: 'reservado',
    CONSUMED: 'consumido',
  };
  const stockText =
    result.stock.from === result.stock.to
      ? 'stock sin cambios'
      : `stock ${stockLabel[result.stock.from]} → ${stockLabel[result.stock.to]}`;
  const changes = [
    `estado ${result.state.fromName} → ${result.state.toName}`,
    stockText,
  ];
  if (result.changes?.workflow) {
    changes.push(`flujo actualizado a la revisión ${result.workflow.revision}`);
  }
  if (result.changes?.warehouse) changes.push('almacén reconciliado');
  if (result.changes?.markers) changes.push('marcadores sincronizados');
  return `Pedido reparado: ${changes.join('; ')}.`;
}
