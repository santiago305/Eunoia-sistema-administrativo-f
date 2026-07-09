import { UpcomingPaymentsTable } from "./UpcomingPaymentsTable";
import type { PurchaseDashboardPaymentRow } from "@/features/purchases/types/purchase-dashboard.types";

export function OverduePaymentsTable({ rows, limit }: { rows: PurchaseDashboardPaymentRow[]; limit?: number }) {
  return <UpcomingPaymentsTable title="Pagos vencidos" rows={rows} limit={limit} />;
}
