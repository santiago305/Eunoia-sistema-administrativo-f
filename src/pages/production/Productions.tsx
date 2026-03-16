import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageTitle } from "@/components/PageTitle";
import { FilterableSelect } from "@/components/SelectFilterable";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { useSidebarContext } from "@/components/dashboard/SidebarContext";
import { listActive } from "@/services/warehouseServices";
import {
  cancelProductionOrder,
  closeProductionOrder,
  listProductionOrders,
  startProductionOrder,
} from "@/services/productionService";
import { toDateInputValue, tryShowPicker, todayIso, buildMonthStartIso } from "@/utils/functionPurchases";
import { Dropdown } from "@/pages/purchases/components/PurchaseDropdown";
import { Menu, OctagonAlert, Plus, Timer } from "lucide-react";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import { ProductionStatus, type ProductionOrder } from "@/pages/production/types/production";
import TimerToEnd, { formatDate } from "@/component/TimerToEnd";
import { RoutesPaths } from "@/Router/config/routesPaths";
import { useNavigate } from "react-router-dom";

const PRIMARY = "#21b8a6";

const statusLabels: Record<ProductionStatus, string> = {
  [ProductionStatus.DRAFT]: "Borrador",
  [ProductionStatus.IN_PROGRESS]: "En proceso",
  [ProductionStatus.PARTIAL]: "Parcial",
  [ProductionStatus.COMPLETED]: "Completado",
  [ProductionStatus.CANCELLED]: "Cancelado",
};

export default function Production() {
  const { showFlash, clearFlash } = useFlashMessage();
  const { setCollapsed } = useSidebarContext();
  const navigate = useNavigate();

  const [warehouseId, setWarehouseId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ProductionStatus>("");
  const [fromDate, setFromDate] = useState(() => buildMonthStartIso());
  const [toDate, setToDate] = useState(() => todayIso());
  const [page, setPage] = useState(1);
  const limit = 10;

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [warehouseOptions, setWarehouseOptions] = useState<{ value: string; label: string; address?: string }[]>([]);

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
    console.log("loadOrders called", {
      loading,
      page,
      warehouseId,
      statusFilter,
      fromDate,
      toDate,
    });
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
      console.log("loadOrders result", {
        items: res.items?.length,
        total: res.total,
        first: res.items?.[0],
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

  useEffect(() => {
    void loadWarehouses();
  }, []);

  useEffect(() => {
    setCollapsed(true);
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [page, warehouseId, statusFilter, fromDate, toDate]);

  const now = new Date().toISOString();
  const safePage = Math.max(1, pagination.page || page);
  const totalPages = Math.max(1, pagination.totalPages);
  const startIndex = pagination.total === 0 ? 0 : (safePage - 1) * (pagination.limit || limit) + 1;
  const endIndex = Math.min(safePage * (pagination.limit || limit), pagination.total);

  const warehouseMetaById = useMemo(() => {
    const map = new Map<string, { label: string; address?: string }>();
    warehouseOptions.forEach((opt) => {
      if (opt.value) map.set(opt.value, { label: opt.label, address: opt.address });
    });
    return map;
  }, [warehouseOptions]);

  const listKey = useMemo(() => `${page}|${warehouseId}|${statusFilter}|${fromDate}|${toDate}`, [page, warehouseId, statusFilter, fromDate, toDate]);

  return (
    <div className="w-full min-h-screen bg-white">
      <PageTitle title="Producción" />
      <div className="mx-auto w-full max-w-[1500px] 2xl:max-w-[1700px] 3xl:max-w-[1900px] 
      px-4 sm:px-6 lg:px-8 pt-2 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Producción</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-0 text-[10px]">
              Total: <span className="font-semibold text-black">{pagination.total}</span>
            </div>
          </div>
        </div>

        <section className=" bg-gray-50 shadow-sm  p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[0.2fr_0.2fr_1fr_1fr]">
            <label className="text-[10px] text-black/60 font-bold">
              Fecha inicio
              <input
                type="date"
                className="h-8 w-full rounded-lg border border-black/10 bg-white px-3 text-[10px]
                mt-1 outline-none focus:ring-2"
                style={ringStyle}
                value={toDateInputValue(fromDate)}
                onClick={(e) => tryShowPicker(e.currentTarget)}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="text-[10px] text-black/60 font-bold">
              Fecha fin
              <input
                type="date"
                className="h-8 w-full rounded-lg border border-black/10 bg-white px-3 text-[10px]
                mt-1 outline-none focus:ring-2"
                style={ringStyle}
                value={toDateInputValue(toDate)}
                onClick={(e) => tryShowPicker(e.currentTarget)}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </label>

            <label className="text-[10px] text-black/60 font-bold">
              Almacén
              <FilterableSelect
                value={warehouseId}
                onChange={(value) => {
                  setWarehouseId(value);
                  setPage(1);
                }}
                options={warehouseOptions}
                placement="bottom"
                placeholder="Almacén (todos)"
                searchPlaceholder="Buscar almacén..."
                className="h-8"
                textSize="text-[10px] mt-1"
              />
            </label>

            <label className="text-[10px] text-black/60 font-bold">
              Estado
              <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
                <select
                  className="h-8 w-full appearance-none rounded-lg border border-black/10 bg-white px-3 
                  text-[10px] outline-none focus:ring-2"
                  style={ringStyle}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as "" | ProductionStatus);
                    setPage(1);
                  }}
                >
                  <option value="">Estado (todos)</option>
                  <option value={ProductionStatus.DRAFT}>Borrador</option>
                  <option value={ProductionStatus.IN_PROGRESS}>En proceso</option>
                  <option value={ProductionStatus.COMPLETED}>Completado</option>
                  <option value={ProductionStatus.CANCELLED}>Cancelado</option>
                </select>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[10px] text-white focus:outline-none focus:ring-2"
                  style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                  onClick={() => navigate(RoutesPaths.productionCreate)}
                >
                  <Plus className="h-4 w-4" />
                  Orden de producción
                </button>
              </div>
            </label>
          </div>
        </section>

        <section className=" border-black/10 bg-white shadow-sm overflow-hidden">
          <div className="max-h-[calc(100vh-220px)] min-h-[calc(100vh-220px)] overflow-auto">
            <table className="w-full h-full table-fixed">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b border-black/10 text-black/60 text-[10px]">
                  <th className="py-3 px-3 text-left w-[80px]">Registro</th>
                  <th className="py-3 px-3 text-left w-[80px]">Referencia</th>
                  <th className="py-3 px-3 text-left w-[120px]">Almacén origen</th>
                  <th className="py-3 px-3 text-left w-[120px]">Almacén destino</th>
                  <th className="py-3 px-3 text-left w-[70px]">Estado</th>
                  <th className="py-3 px-3 text-left w-[120px]">T. Producción</th>
                  <th className="py-3 px-3 text-left w-[90px]">Termino</th>
                  <th className="py-3 px-0 text-left w-[20px]"></th>
                </tr>
              </thead>
              <tbody key={listKey}>
                {orders.map((order) => {
                  const fromWarehouse = order.fromWarehouseId ? warehouseMetaById.get(order.fromWarehouseId) : undefined;
                  const toWarehouse = order.toWarehouseId ? warehouseMetaById.get(order.toWarehouseId) : undefined;
                  const statusLabel = order.status ? (statusLabels[order.status] ?? order.status) : "-";
                  const dateCreated = formatDate(new Date(order.manufactureDate ?? "-"));
                  const timeCreated = order.manufactureDate
                      ? new Date(order.manufactureDate).toLocaleTimeString("es-PE", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                        })
                      : undefined;
                  const dateEnd = formatDate(new Date(order.manufactureDate ?? "-"));
                  const timeEnd = order.manufactureDate
                      ? new Date(order.manufactureDate).toLocaleTimeString("es-PE", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                        })
                      : undefined;
                  return (
                    <tr key={order.productionId ?? `${order.fromWarehouseId}-${order.toWarehouseId}-${order.createdAt}`} className="border-b border-black/5 text-[10px]">
                      <td className="py-1 px-3 text-black/70">
                        {dateCreated} <br/>
                        {timeCreated}
                      </td>
                      <td className="py-1 px-3 text-black/70">{order.reference ?? "-"}</td>
                      <td className="py-1 px-3 text-black/70">
                        <div>{fromWarehouse?.label ?? order.fromWarehouseId ?? "-"}</div>
                      </td>
                      <td className="py-1 px-3 text-black/70">
                        <div>{toWarehouse?.label ?? order.toWarehouseId ?? "-"}</div>
                      </td>
                      <td className="py-1 px-3">
                        <span className="inline-flex rounded-lg px-2 py-1 text-[10px] font-medium 
                        bg-slate-50 text-slate-700">{statusLabel}
                        </span>
                      </td>
                      <td>
                        <div className="flex h-full items-center justify-center">
                            {order.status === ProductionStatus.IN_PROGRESS && (
                                <span className="inline-flex rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                                    <TimerToEnd from={now} to={order.manufactureDate ?? ""} 
                                    loadProductionOrders={loadOrders} />
                                </span>
                            )}
                            {order.status === ProductionStatus.PARTIAL && (
                                <span className="flex flex-col items-center rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                                    <OctagonAlert className="h-4 w-4" />
                                    <span className="mt-1">Por Ing.</span>
                                </span>
                            )}
                            {order.status === ProductionStatus.COMPLETED && (
                                <span className="flex flex-col items-center rounded-lg p-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                                    <Timer className="h-4 w-4" />
                                    <span className="mt-1">Completado</span>
                                </span>
                            )}
                        </div>
                      </td>
                      <td className="py-1 px-3 text-black/70">
                        {dateEnd} <br />
                        {timeEnd}
                      </td>
                      <td className="py-1 px-0">
                        <Dropdown
                          trigger={<Menu className="h-4 w-4" />}
                          itemClassName="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-black/70 hover:bg-black/[0.04]"
                          items={[
                            order.status === ProductionStatus.DRAFT && {
                              label: "Procesar",
                              onClick: () => handleStart(order.productionId ?? ""),
                            },
                            order.status === ProductionStatus.DRAFT && {
                              label: "Cancelar",
                              className:
                                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-rose-700 hover:bg-rose-50",
                              onClick: () => handleCancel(order.productionId ?? ""),
                            },
                            (order.status === ProductionStatus.IN_PROGRESS ||
                              order.status === ProductionStatus.PARTIAL) && {
                              label: "Ingresar a elmacen",
                              onClick: () => handleClose(order.productionId ?? ""),
                            },
                          ].filter(Boolean)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && orders.length === 0 && <div className="px-5 py-8 text-[10px] text-black/60">No hay órdenes con los filtros actuales.</div>}
            {error && <div className="px-5 py-4 text-[10px] text-rose-600">{error}</div>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-black/10 text-[10px] text-black/60">
            <span className="hidden sm:inline">
              Mostrando {startIndex}-{endIndex} de {pagination.total}
            </span>

            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] hover:bg-black/[0.03] disabled:opacity-40"
                disabled={!pagination.hasPrev || loading}
                onClick={() => setPage(Math.max(1, safePage - 1))}
                type="button"
              >
                Anterior
              </button>

              <span className="tabular-nums">
                Página {safePage} de {totalPages}
              </span>

              <button
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] hover:bg-black/[0.03] disabled:opacity-40"
                disabled={!pagination.hasNext || loading}
                onClick={() => setPage(safePage + 1)}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
