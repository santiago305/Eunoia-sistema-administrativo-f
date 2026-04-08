import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Menu, Plus, Timer, OctagonAlert, FileText, Pencil, Play, Ban, PackageCheck, Filter } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { FloatingInput } from "@/components/FloatingInput";
import { FloatingSelect } from "@/components/FloatingSelect";
import { SystemButton } from "@/components/SystemButton";
import { SectionHeaderForm } from "@/components/SectionHederForm";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import { ActionsPopover } from "@/components/ActionsPopover";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";
import { listActive } from "@/services/warehouseServices";
import {
  cancelProductionOrder,
  closeProductionOrder,
  listProductionOrders,
  startProductionOrder,
} from "@/services/productionService";
import { getProductionOrderPdf } from "@/services/pdfServices";
import {
  toDateInputValue,
  tryShowPicker,
  todayIso,
  buildMonthStartIso,
} from "@/utils/functionPurchases";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import { ProductionStatus, type ProductionOrder } from "@/pages/production/types/production";
import { RoutesPaths } from "@/router/config/routesPaths";
import { useNavigate } from "react-router-dom";
import TimerToEnd from "@/components/TimerToEnd";
import { PdfViewerModal } from "@/components/ModalOpenPdf";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";

const PRIMARY = "hsl(var(--primary))";
const DEFAULT_LIMIT = 10;

const statusLabels: Record<ProductionStatus, string> = {
  [ProductionStatus.DRAFT]: "Borrador",
  [ProductionStatus.IN_PROGRESS]: "En proceso",
  [ProductionStatus.PARTIAL]: "Parcial",
  [ProductionStatus.COMPLETED]: "Completado",
  [ProductionStatus.CANCELLED]: "Cancelado",
};

type ProductionRow = {
  id: string;
  registro: string;
  serie: string;
  referencia: string;
  almacenOrigen: string;
  almacenDestino: string;
  estado?: ProductionStatus;
  tiempoProduccion?: ProductionStatus;
  termino: string;
  original: ProductionOrder;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export default function Production() {
  const { showFlash, clearFlash } = useFlashMessage();
  const navigate = useNavigate();

  const [warehouseId, setWarehouseId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductionStatus>("all");
  const [fromDate, setFromDate] = useState(() => buildMonthStartIso());
  const [toDate, setToDate] = useState(() => todayIso());
  const [openPdfModal, setOpenPdfModal] = useState(false);
  const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);

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
  const [warehouseOptions, setWarehouseOptions] = useState<
    { value: string; label: string; address?: string }[]
  >([]);

  const [page, setPage] = useState(1);
  const limit = DEFAULT_LIMIT;
  const nowIso = useMemo(() => new Date().toISOString(), []);

  const loadWarehouses = async () => {
    try {
      const res = await listActive();
      const options =
        res?.map((warehouse: Warehouse) => {
          const address = `${warehouse.department}-${warehouse.province}-${warehouse.district}`;
          return {
            value: warehouse.warehouseId,
            label: warehouse.name,
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

    try {
      const status = statusFilter === "all" ? undefined : statusFilter;
      const res = await listProductionOrders({
        page,
        limit,
        warehouseId: warehouseId || undefined,
        status,
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
      await loadOrders();
    } catch {
      showFlash(errorResponse("Error al iniciar la orden"));
    }
  };

  const handleClose = async (id: string) => {
    clearFlash();
    try {
      await closeProductionOrder(id);
      showFlash(successResponse("Orden cerrada"));
      await loadOrders();
    } catch {
      showFlash(errorResponse("Error al cerrar la orden"));
    }
  };

  const handleCancel = async (id: string) => {
    clearFlash();
    try {
      await cancelProductionOrder(id);
      showFlash(successResponse("Orden cancelada"));
      await loadOrders();
    } catch {
      showFlash(errorResponse("Error al cancelar la orden"));
    }
  };

  const handleEdit = (id: string) => {
    if (!id) return;
    navigate(RoutesPaths.productionEdit.replace(":productionId", encodeURIComponent(id)));
  };

  const openProductionPdf = (id: string) => {
    clearFlash();
    setSelectedProductionId(id);
    setOpenPdfModal(true);
  };

  useEffect(() => {
    void loadWarehouses();
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [page, warehouseId, statusFilter, fromDate, toDate]);

  const statusOptions = [
    { value: "all", label: "Estado (todos)" },
    { value: ProductionStatus.DRAFT, label: "Borrador" },
    { value: ProductionStatus.IN_PROGRESS, label: "En proceso" },
    { value: ProductionStatus.PARTIAL, label: "Parcial" },
    { value: ProductionStatus.COMPLETED, label: "Completado" },
    { value: ProductionStatus.CANCELLED, label: "Cancelado" },
  ];

  const rows = useMemo<ProductionRow[]>(() => {
    return (orders ?? []).map((order) => ({
      id:
        order.productionId ??
        `${order.fromWarehouseId}-${order.toWarehouseId}-${order.createdAt ?? ""}`,
      registro: formatDateTime(order.manufactureDate),
      serie: order.serie?.code ? `${order.serie.code} - ${order.correlative}` : "-",
      referencia: order.reference || "-",
      almacenOrigen: order.fromWarehouse?.name ?? "-",
      almacenDestino: order.toWarehouse?.name ?? "-",
      estado: order.status ?? ProductionStatus.DRAFT,
      tiempoProduccion: order.status ?? ProductionStatus.DRAFT,
      termino: formatDateTime(order.manufactureDate),
      original: order,
    }));
  }, [orders]);

  const columns = useMemo<DataTableColumn<ProductionRow>[]>(() => {
    return [
      {
        id: "registro",
        header: "Registro",
        accessorKey: "registro",
        hideable: false,
      },
      {
        id: "serie",
        header: "Serie",
        accessorKey: "serie",
        sortable: false,
      },
      {
        id: "referencia",
        header: "Referencia",
        accessorKey: "referencia",
        sortable: false,
      },
      {
        id: "almacenOrigen",
        header: "Almacen origen",
        accessorKey: "almacenOrigen",
        sortable: false,
      },
      {
        id: "almacenDestino",
        header: "Almacen destino",
        accessorKey: "almacenDestino",
        sortable: false,
      },
      {
        id: "estado",
        header: "Estado",
        cell: (row) => (
          <span className="inline-flex rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700">
            {row.estado ? (statusLabels[row.estado] ?? "-") : "-"}
          </span>
        ),
        hideable: false,
        sortable: false,
      },
      {
        id: "tiempoProduccion",
        header: "T. Produccion",
        cell: (row) => {
          const order = row.original;

          return (
            <div className="flex h-full items-center justify-center">
              {order.status === ProductionStatus.IN_PROGRESS ? (
                <span className="inline-flex rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700">
                  <TimerToEnd
                    from={nowIso}
                    to={order.manufactureDate ?? ""}
                    loadProductionOrders={loadOrders}
                  />
                </span>
              ) : null}

              {order.status === ProductionStatus.PARTIAL ? (
                <span className="flex flex-col items-center rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700">
                  <OctagonAlert className="h-4 w-4" />
                  <span className="mt-1">Por ing.</span>
                </span>
              ) : null}

              {order.status === ProductionStatus.COMPLETED ? (
                <span className="flex flex-col items-center rounded-lg bg-slate-50 p-1 text-[10px] font-medium text-slate-700">
                  <Timer className="h-4 w-4" />
                  <span className="mt-1">Completado</span>
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "termino",
        header: "Termino",
        accessorKey: "termino",
      },
      {
        id: "actions",
        header: "ACCIONES",
        headerClassName: "text-center w-[70px]",
        cell: (row) => {
          const order = row.original;

          return (
            <div className="flex justify-center">
              <ActionsPopover
                actions={[
                  {
                    id: "start",
                    label: "Procesar",
                    icon: <Play className="h-4 w-4 text-black/60" />,
                    hidden: order.status !== ProductionStatus.DRAFT,
                    onClick: () => handleStart(order.productionId ?? ""),
                  },
                  {
                    id: "edit",
                    label: "Editar",
                    icon: <Pencil className="h-4 w-4 text-black/60" />,
                    hidden: order.status !== ProductionStatus.DRAFT,
                    onClick: () => handleEdit(order.productionId ?? ""),
                  },
                  {
                    id: "pdf",
                    label: "Abrir PDF",
                    icon: <FileText className="h-4 w-4 text-black/60" />,
                    onClick: () => openProductionPdf(order.productionId ?? ""),
                  },
                  {
                    id: "cancel",
                    label: "Cancelar",
                    icon: <Ban className="h-4 w-4" />,
                    danger: true,
                    className: "text-rose-700 hover:bg-rose-50",
                    hidden: order.status !== ProductionStatus.DRAFT,
                    onClick: () => handleCancel(order.productionId ?? ""),
                  },
                  {
                    id: "close",
                    label: "Ingresar a almacen",
                    icon: <PackageCheck className="h-4 w-4 text-black/60" />,
                    hidden: !(
                      order.status === ProductionStatus.IN_PROGRESS ||
                      order.status === ProductionStatus.PARTIAL
                    ),
                    onClick: () => handleClose(order.productionId ?? ""),
                  },
                ]}
                columns={1}
                triggerIcon={<Menu className="h-4 w-4" />}
                compact
                showLabels
                popoverClassName="min-w-35"
                popoverBodyClassName="p-2"
                renderAction={(action, helpers) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      helpers.onAction(action);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03] ${action.className ?? ""}`}
                    disabled={action.disabled}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                )}
              />
            </div>
          );
        },
        className: "text-right",
        hideable: false,
      },
    ];
  }, [nowIso, orders]);

  return (
    <PageShell className="bg-white">
      <PageTitle title="Produccion" />

      <div className="space-y-4">
        <div className="my-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <Headed title="Ordenes de Produccion" size="lg" />

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-1 text-[10px]">
              Total: <span className="font-semibold text-black">{pagination.total}</span>
            </div>
          </div>
        </div>

        <section className="space-y-4 rounded-2xl border border-black/10 bg-gray-50 p-4 shadow-sm">
          <SectionHeaderForm icon={Filter} title="Filtros" />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[0.2fr_0.2fr_0.4fr_0.4fr_0.28fr]">
            <FloatingInput
              label="Fecha inicio"
              name="fromDate"
              type="date"
              value={toDateInputValue(fromDate)}
              onClick={(event) => tryShowPicker(event.currentTarget)}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
            />

            <FloatingInput
              label="Fecha fin"
              name="toDate"
              type="date"
              value={toDateInputValue(toDate)}
              onClick={(event) => tryShowPicker(event.currentTarget)}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
            />

            <FloatingSelect
              label="Almacen"
              name="warehouseId"
              value={warehouseId}
              onChange={(value) => {
                setWarehouseId(value);
                setPage(1);
              }}
              options={warehouseOptions}
              searchable
              searchPlaceholder="Buscar almacen..."
              emptyMessage="Sin almacenes"
            />

            <FloatingSelect
              label="Estado"
              name="statusFilter"
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as "all" | ProductionStatus);
                setPage(1);
              }}
              options={statusOptions}
              searchable={false}
            />

            <SystemButton
              leftIcon={<Plus className="h-4 w-4" />}
              className="h-10"
              style={{
                backgroundColor: PRIMARY,
                borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent) `,
              }}
              onClick={() => navigate(RoutesPaths.productionCreate)}
            >
              Orden de produccion
            </SystemButton>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <DataTable
            tableId="production-orders-table"
            data={rows}
            columns={columns}
            rowKey="id"
            loading={loading}
            emptyMessage="No hay ordenes con los filtros actuales."
            hoverable={false}
            animated={false}
            selectableColumns
            pagination={{
              page,
              limit,
              total: pagination.total,
            }}
            onPageChange={setPage}
          />
        </section>

        <PdfViewerModal
          open={openPdfModal}
          onClose={() => {
            setOpenPdfModal(false);
            setSelectedProductionId(null);
          }}
          title="Orden de produccion"
          getPdf={() => getProductionOrderPdf(selectedProductionId!)}
          primaryColor={PRIMARY}
        />
      </div>
    </PageShell>
  );
}

