import { UpcomingPaymentsTable } from "./UpcomingPaymentsTable";
import type { PurchaseDashboardPaymentRow } from "@/features/purchases/types/purchase-dashboard.types";

export function OverduePaymentsTable({ rows }: { rows: PurchaseDashboardPaymentRow[] }) {
  return <UpcomingPaymentsTable title="Pagos vencidos" rows={rows} />;
}
