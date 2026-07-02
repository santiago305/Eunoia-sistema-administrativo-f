import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DashboardSaleOrdersUbigeoGroup,
  DashboardSaleOrdersUbigeoResponse,
  DashboardUbigeoLevel,
} from "./types";

import {
  getDashboardSaleOrdersByDepartment,
  getDashboardSaleOrdersByDistrict,
  getDashboardSaleOrdersByProvince,
} from "@/shared/services/dashboardService";

import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { DashboardSaleOrderSmartFilter } from "./components/DashboardSaleOrderSmartFilter";
import { SaleOrderStatisticsPanel } from "@/features/sale-orders/components/statistics/SaleOrderStatisticsPanel";
import { DataTableSearchChips } from "@/shared/components/table/search";
import { getSaleOrderStatistics } from "@/shared/services/saleOrderService";
import type {
  SaleOrderSearchRule,
  SaleOrderStatisticsResponse,
} from "@/features/sale-orders/types/saleOrder";
import {
  buildSaleOrderSearchChips,
  createEmptySaleOrderSearchFilters,
  removeSaleOrderSearchKey,
  sanitizeSaleOrderSearchSnapshot,
  upsertSaleOrderSearchRule,
  type SaleOrderSearchFilterKey,
} from "@/features/sale-orders/utils/saleOrderSmartSearch";

type Selection = {
  departmentId?: string;
  departmentLabel?: string;
  provinceId?: string;
  provinceLabel?: string;
};

const INCLUDE_CANCELLED_STORAGE_KEY = "dashboard-sale-orders-include-cancelled";

function getStoredIncludeCancelled() {
  try {
    return localStorage.getItem(INCLUDE_CANCELLED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export default function Dashboard() {
  const [filters, setFilters] = useState(() => createEmptySaleOrderSearchFilters());
  const [includeCancelled, setIncludeCancelled] =
    useState(getStoredIncludeCancelled);

  const [level, setLevel] =
    useState<DashboardUbigeoLevel>("department");

  const [selection, setSelection] =
    useState<Selection>({});

  const [data, setData] =
    useState<DashboardSaleOrdersUbigeoResponse | null>(
      null,
    );

  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [statistics, setStatistics] =
    useState<SaleOrderStatisticsResponse | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [statisticsError, setStatisticsError] =
    useState<string | null>(null);
  const statisticsRequestRef = useRef(0);

  const snapshot = useMemo(
    () => sanitizeSaleOrderSearchSnapshot({ filters }),
    [filters],
  );

  const params = useMemo(
    () => ({
      filters: snapshot.filters,
      cancelBool: includeCancelled,
    }),
    [includeCancelled, snapshot.filters],
  );

  const loadCurrentLevel = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response =
        level === "department"
          ? await getDashboardSaleOrdersByDepartment(
              params,
            )
          : level === "province" &&
              selection.departmentId
            ? await getDashboardSaleOrdersByProvince(
                selection.departmentId,
                params,
              )
            : level === "district" &&
                selection.provinceId
              ? await getDashboardSaleOrdersByDistrict(
                  selection.provinceId,
                  params,
                )
              : await getDashboardSaleOrdersByDepartment(
                  params,
                );

      setData(response);
    } catch {
      setError(
        "No se pudieron cargar las métricas del dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    level,
    params,
    selection.departmentId,
    selection.provinceId,
  ]);

  const loadStatistics = useCallback(async () => {
    const requestId = statisticsRequestRef.current + 1;
    statisticsRequestRef.current = requestId;
    setStatisticsLoading(true);
    setStatisticsError(null);

    try {
      const response = await getSaleOrderStatistics({
        filters: snapshot.filters,
        includeCancelled,
      });
      if (statisticsRequestRef.current === requestId) {
        setStatistics(response);
      }
    } catch {
      if (statisticsRequestRef.current === requestId) {
        setStatisticsError("No se pudieron cargar las estadísticas de pedidos.");
      }
    } finally {
      if (statisticsRequestRef.current === requestId) {
        setStatisticsLoading(false);
      }
    }
  }, [includeCancelled, snapshot.filters]);

  useEffect(() => {
    void loadCurrentLevel();
  }, [loadCurrentLevel]);

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    try {
      localStorage.setItem(
        INCLUDE_CANCELLED_STORAGE_KEY,
        String(includeCancelled),
      );
    } catch {
      // localStorage may be unavailable in restricted browser contexts.
    }
  }, [includeCancelled]);

  const handleApplyRule = useCallback((rule: SaleOrderSearchRule) => {
    setFilters((current) =>
      upsertSaleOrderSearchRule(
        sanitizeSaleOrderSearchSnapshot({ filters: current }),
        rule,
      ).filters,
    );
  }, []);

  const handleRemoveRule = useCallback((fieldId: SaleOrderSearchFilterKey) => {
    setFilters((current) =>
      removeSaleOrderSearchKey(
        sanitizeSaleOrderSearchSnapshot({ filters: current }),
        fieldId,
      ).filters,
    );
  }, []);

  const searchChips = useMemo(
    () => buildSaleOrderSearchChips(snapshot, null),
    [snapshot],
  );

  const handleGroupClick = (
    group: DashboardSaleOrdersUbigeoGroup,
  ) => {
    if (!group.id) {
      return;
    }

    if (level === "department") {
      setSelection({
        departmentId: group.id,
        departmentLabel: group.label,
      });

      setLevel("province");
      return;
    }

    if (level === "province") {
      setSelection((current) => ({
        ...current,
        provinceId: group.id,
        provinceLabel: group.label,
      }));

      setLevel("district");
    }
  };

  const goToDepartments = () => {
    setSelection({});
    setLevel("department");
  };

  const goToProvinces = () => {
    if (!selection.departmentId) {
      return;
    }

    setSelection((current) => ({
      departmentId: current.departmentId,
      departmentLabel: current.departmentLabel,
    }));

    setLevel("province");
  };

  const goBack = () => {
    if (level === "district") {
      goToProvinces();
      return;
    }

    if (level === "province") {
      goToDepartments();
    }
  };

  return (
    <main className="scroll-area min-h-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <DashboardSaleOrderSmartFilter
            snapshot={snapshot}
            onApplyRule={handleApplyRule}
            onRemoveRule={handleRemoveRule}
          />
          <FloatingSelect
            label="Incluir cancelados"
            name="dashboard-include-cancelled"
            value={includeCancelled ? "yes" : "no"}
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Sí" },
            ]}
            onChange={(value) => setIncludeCancelled(value === "yes")}
            containerClassName="w-full sm:w-56"
          />
        </div>

        <DataTableSearchChips
          chips={searchChips}
          onRemove={(chip) =>
            handleRemoveRule(chip.removeKey as SaleOrderSearchFilterKey)
          }
        />
        <SaleOrderStatisticsPanel
          statistics={statistics}
          loading={statisticsLoading}
          error={statisticsError}
          compact={false}
          showTotals
          showCharts
          locationDistribution={{
            data,
            loading,
            error,
            level,
            onGroupClick: handleGroupClick,
            onBack: goBack,
          }}
        />
      </div>
    </main>
  );
}

