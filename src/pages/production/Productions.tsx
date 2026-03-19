import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageTitle } from "@/components/PageTitle";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import {
  cancelProductionOrder,
  closeProductionOrder,
  listProductionOrders,
  startProductionOrder,
} from "@/services/productionService";
import { toDateInputValue, tryShowPicker, todayIso, buildMonthStartIso } from "@/utils/functionPurchases";
import { Plus } from "lucide-react";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import { ProductionStatus, type ProductionOrder } from "@/pages/production/types/production";
import { RoutesPaths } from "@/Router/config/routesPaths";
import { useNavigate } from "react-router-dom";

import { DataTable } from "@/components/data-table/DataTable";
import { DataTableColumnMenu } from "@/components/data-table/DataTableColumnMenu";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import {
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ExpandedState,
  type PaginationState,
  type VisibilityState,
} from "@tanstack/react-table";
import { getProductionColumns } from "./components/data-table/Production.columns";
import { ProductionExpandedRow } from "./components/data-table/ProductionExpandedRow";
import { hasHiddenExpandableFields } from "@/components/data-table/expanded-hidden-fields/hasHiddenExpandableFields";
import { productionExpandedFields } from "./components/data-table/productionExpandedFields";
import { getProductionOrderPdf } from "@/services/pdfServices";

const PRIMARY = "#21b8a6";
const DEFAULT_LIMIT = 10;

const statusLabels: Record<ProductionStatus, string> = {
  [ProductionStatus.DRAFT]: "Borrador",
  [ProductionStatus.IN_PROGRESS]: "En proceso",
  [ProductionStatus.PARTIAL]: "Parcial",
  [ProductionStatus.COMPLETED]: "Completado",
  [ProductionStatus.CANCELLED]: "Cancelado",
};

export default function Production() {
  const { showFlash, clearFlash } = useFlashMessage();
  const navigate = useNavigate();

  const [warehouseId, setWarehouseId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ProductionStatus>("");
  const [fromDate, setFromDate] = useState(() => buildMonthStartIso());
  const [toDate, setToDate] = useState(() => todayIso());

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [warehouseOptions, setWarehouseOptions] = useState<
    { value: string; label: string; address?: string }[]
  >([]);

  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_LIMIT,
  });
  const page = paginationState.pageIndex + 1;
  const limit = paginationState.pageSize;

  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    serie: false,
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const ringStyle = { "--tw-ring-color": `${PRIMARY}33` } as CSSProperties;

  const loadWarehouses = async () => {
    try {
      const res = await listActive();
      const options =
        res?.map((s: Warehouse) => {
          const address = `${s.department}-${s.province}-${s.district}`;
          return {
            value: s.warehouseId,
            label: s.name,
            address,
          };
        }) ?? [];
      setWarehouseOptions([{ value: "", label: "Todos" }, ...options]);
    } catch {
      setWarehouseOptions([{ value: "", label: "Todos" }]);
      showFlash(errorResponse("Error al cargar almacenes"));
    }
  };

  const loadOrders = async () => {
    if (loading) return;
    clearFlash();
    setLoading(true);
    setError(null);
    try {
      const res = await listProductionOrders({
        page,
        limit,
        warehouseId: warehouseId || undefined,
        status: statusFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setOrders(res.items ?? []);
      const nextTotal = res.total ?? 0;
      const nextPage = res.page ?? page;
      const nextLimit = res.limit ?? limit;
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / (nextLimit || limit)));
      setPagination({
        total: nextTotal,
        page: nextPage,
        limit: nextLimit,
        totalPages: nextTotalPages,
        hasPrev: nextPage > 1,
        hasNext: nextPage < nextTotalPages,
      });
    } catch {
      setOrders([]);
      setPagination((prev) => ({
        ...prev,
        total: 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
      }));
      setError("Error al listar producciones");
      showFlash(errorResponse("Error al listar producciones"));
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    clearFlash();
    try {
      await startProductionOrder(id);
      showFlash(successResponse("Orden iniciada"));
      loadOrders();
    } catch {
      showFlash(errorResponse("Error al iniciar la orden"));
    }
  };

  const handleClose = async (id: string) => {
    clearFlash();
    try {
      await closeProductionOrder(id);
      showFlash(successResponse("Orden cerrada"));
      loadOrders();
    } catch {
      showFlash(errorResponse("Error al cerrar la orden"));
    }
  };

  const handleCancel = async (id: string) => {
    clearFlash();
    try {
      await cancelProductionOrder(id);
      showFlash(successResponse("Orden cancelada"));
      loadOrders();
    } catch {
      showFlash(errorResponse("Error al cancelar la orden"));
    }
  };

  const handleEdit = (id: string) => {
    if (!id) return;
    navigate(RoutesPaths.productionEdit.replace(":productionId", encodeURIComponent(id)));
  };

  const openProductionPdf = async (id: string) => {
      clearFlash();
      try {
          const blob = await getProductionOrderPdf(id);
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `orden-compra-${id}.pdf`;
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch {
          showFlash(errorResponse("Error al generar el PDF"));
      }
  };
  useEffect(() => {
    void loadWarehouses();
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [page, limit, warehouseId, statusFilter, fromDate, toDate]);

  useEffect(() => {
    setExpanded({});
  }, [columnVisibility, warehouseId, statusFilter, fromDate, toDate]);

  const nowIso = useMemo(() => new Date().toISOString(), []);
  const safePage = Math.max(1, pagination.page || page);
  const totalPages = Math.max(1, pagination.totalPages);
  const startIndex =
    pagination.total === 0 ? 0 : (safePage - 1) * (pagination.limit || limit) + 1;
  const endIndex = Math.min(safePage * (pagination.limit || limit), pagination.total);

  const columns = useMemo(
    () =>
      getProductionColumns({
        columnVisibility,
        nowIso,
        statusLabels,
        onStart: handleStart,
        onClose: handleClose,
        onCancel: handleCancel,
        onEdit: handleEdit,
        onPdf: openProductionPdf,
        loadOrders,
      }),
    [columnVisibility, nowIso]
  );

  const canExpandRows = useMemo(
    () => hasHiddenExpandableFields(productionExpandedFields, columnVisibility),
    [columnVisibility]
  );

  const table = useReactTable({
    data: orders,
    columns,
    state: {
      pagination: paginationState,
      expanded,
      columnVisibility,
    },
    onPaginationChange: setPaginationState,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => canExpandRows,
    getRowId: (row) => row.productionId ?? `${row.fromWarehouseId}-${row.toWarehouseId}-${row.createdAt ?? ""}`,
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <div className="w-full min-h-screen bg-white">
      <PageTitle title="Produccion" />
      <div className="mx-auto w-full max-w-[1500px] space-y-4 px-4 pt-2 sm:px-6 lg:px-8 2xl:max-w-[1700px] 3xl:max-w-[1900px]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Produccion</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-0 text-[10px]">
              Total: <span className="font-semibold text-black">{pagination.total}</span>
            </div>
          </div>
        </div>

        <section className="space-y-3 bg-gray-50 p-4 shadow-sm">
          <div className="grid gap-3 grid-cols-[0.2fr_0.2fr_0.4fr_0.4fr_0.3fr_0.1fr]">
            <label className="text-[10px] font-bold text-black/60">
              Fecha inicio
              <input
                type="date"
                className="mt-1 h-8 w-full rounded-lg border border-black/10 bg-white px-3 text-[10px] outline-none focus:ring-2"
                style={ringStyle}
                value={toDateInputValue(fromDate)}
                onClick={(e) => tryShowPicker(e.currentTarget)}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
                }}
              />
            </label>
            <label className="text-[10px] font-bold text-black/60">
              Fecha fin
              <input
                type="date"
                className="mt-1 h-8 w-full rounded-lg border border-black/10 bg-white px-3 text-[10px] outline-none focus:ring-2"
                style={ringStyle}
                value={toDateInputValue(toDate)}
                onClick={(e) => tryShowPicker(e.currentTarget)}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
                }}
              />
            </label>

            <label className="text-[10px] font-bold text-black/60">
              Almacen
              <FilterableSelect
                value={warehouseId}
                onChange={(value) => {
                  setWarehouseId(value);
                  setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                options={warehouseOptions}
                placement="bottom"
                placeholder="Almacen (todos)"
                searchPlaceholder="Buscar almacen..."
                className="h-8"
                textSize="text-[10px] mt-1"
              />
            </label>

            <label className="text-[10px] font-bold text-black/60">
              Estado
              <div className="mt-1 gap-2">
                <select
                  className="h-8 w-full appearance-none rounded-lg border border-black/10 bg-white px-3 text-[10px] outline-none focus:ring-2"
                  style={ringStyle}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as "" | ProductionStatus);
                    setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                >
                  <option value="">Estado (todos)</option>
                  <option value={ProductionStatus.DRAFT}>Borrador</option>
                  <option value={ProductionStatus.IN_PROGRESS}>En proceso</option>
                  <option value={ProductionStatus.COMPLETED}>Completado</option>
                  <option value={ProductionStatus.CANCELLED}>Cancelado</option>
                </select>
              </div>
            </label>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-2 rounded-lg border px-3 
                text-[11px] text-white focus:outline-none focus:ring-2 mt-5"
                style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                onClick={() => navigate(RoutesPaths.productionCreate)}
              >
                <Plus className="h-4 w-4" />
                Orden de produccion
              </button>
            <div className="flex items-center justify-end">
              <DataTableColumnMenu
                table={table}
                open={showColumnMenu}
                onToggleOpen={() => setShowColumnMenu((prev) => !prev)}
                hiddenColumnIds={['expander', 'actions']}
                className="h-8 mt-5"
              />
            </div>
          </div>

        </section>

        <section className="overflow-hidden border-black/10 bg-white shadow-sm">
          <DataTable
            table={table}
            loading={loading}
            error={error}
            emptyMessage="No hay ordenes con los filtros actuales."
            renderExpandedRow={(row) => (
              <ProductionExpandedRow order={row.original} columnVisibility={columnVisibility} />
            )}
            headerCellClassName={(header) => {
              if (header.column.id === "actions") return "px-3 py-3 text-right";
              if (header.column.id === "expander") return "px-3 py-3 text-center";
              return "px-3 py-3 text-left";
            }}
            bodyCellClassName={(cell) => {
              if (cell.column.id === "actions") return "px-3 py-3 align-middle text-right";
              if (cell.column.id === "expander") return "px-3 py-3 align-middle text-center";
              return "px-3 py-3 align-middle";
            }}
          />

          <DataTablePagination
            loading={loading}
            total={pagination.total}
            page={safePage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            pageSize={paginationState.pageSize}
            hasPrev={pagination.hasPrev}
            hasNext={pagination.hasNext}
            onPageSizeChange={(value) => {
              setPaginationState({ pageIndex: 0, pageSize: value });
              setExpanded({});
            }}
            onPrevious={() => table.previousPage()}
            onNext={() => table.nextPage()}
          />
        </section>
      </div>
    </div>
  );
}
