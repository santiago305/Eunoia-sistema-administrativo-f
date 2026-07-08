import { useCallback, useEffect, useState } from "react";
import { getPurchaseDashboardData } from "@/shared/services/purchaseDashboardService";
import type { PurchaseDashboardData, PurchaseDashboardFilters } from "@/features/purchases/types/purchase-dashboard.types";
import { usePermissions } from "@/shared/hooks/usePermissions";

export function usePurchaseDashboard(filters: PurchaseDashboardFilters) {
  const { permissions } = usePermissions();
  const [data, setData] = useState<PurchaseDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getPurchaseDashboardData(filters, permissions));
    } catch {
      setError("No se pudo cargar el dashboard de compras.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters, permissions]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
