import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Menu, Timer, OctagonAlert, FileText, Pencil, Play, Ban, PackageCheck, Plus } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { DataTable } from "@/components/table/DataTable";
import type { AppliedDataTableFilter, DataTableFilterTree } from "@/components/table/filters";
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
  parseDateInputValue,
  toLocalDateKey,
} from "@/utils/functionPurchases";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import { ProductionStatus, type ProductionOrder } from "@/pages/production/types/production";
import TimerToEnd from "@/components/TimerToEnd";
import { PdfViewerModal } from "@/components/ModalOpenPdf";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";
import { SystemButton } from "@/components/SystemButton";
import { ProductionOrderFormModal } from "@/pages/production/components/ProductionOrderFormModal";
import { useCompany } from "@/hooks/useCompany";

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
  productos: string[];
  productIds: string[];
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

const normalizeSearchText = (value?: string | null) => (value ?? "").toLowerCase().trim();

const getProductionItemLabel = (item: NonNullable<ProductionOrder["items"]>[number]) => {
  const finishedItem = item.finishedItem;
  const productName = finishedItem?.variant?.productName ?? finishedItem?.product?.name ?? "";
  const presentation =
    (finishedItem?.variant?.attributes as { presentation?: string } | undefined)?.presentation ??
    (finishedItem?.product?.attributes as { presentation?: string } | undefined)?.presentation ??
    "";
  const variant =
    (finishedItem?.variant?.attributes as { variant?: string } | undefined)?.variant ??
    (finishedItem?.product?.attributes as { variant?: string } | undefined)?.variant ??
    "";
  const color =
    (finishedItem?.variant?.attributes as { color?: string } | undefined)?.color ??
    (finishedItem?.product?.attributes as { color?: string } | undefined)?.color ??
    "";
  const sku = finishedItem?.variant?.sku ?? finishedItem?.product?.sku ?? "";

  return [productName, presentation, variant, color, sku]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
};

export default function Production() {
  const { showFlash, clearFlash } = useFlashMessage();
  const { hasCompany } = useCompany();
  const companyActionDisabled = !hasCompany;
  const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

  const [warehouseId, setWarehouseId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductionStatus>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openPdfModal, setOpenPdfModal] = useState(false);
  const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);
  const [openFormModal, setOpenFormModal] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingProductionId, setEditingProductionId] = useState<string | undefined>(undefined);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

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
    setFormMode("edit");
    setEditingProductionId(id);
    setOpenFormModal(true);
  };

  const handleCreate = () => {
    setFormMode("create");
    setEditingProductionId(undefined);
    setOpenFormModal(true);
  };

  const handleCloseFormModal = () => {
    setOpenFormModal(false);
    setEditingProductionId(undefined);
    setFormMode("create");
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
    return (orders ?? []).map((order) => {
      const items = order.items ?? [];
      const productos = items
        .map((item) => getProductionItemLabel(item))
        .filter(Boolean);
      const productIds = items
        .map((item) => item.finishedItemId)
        .filter(Boolean);

      return {
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
        productos,
        productIds,
        original: order,
      };
    });
  }, [orders]);

  const productOptions = useMemo(() => {
    const options = new Map<string, { value: string; label: string }>();

    rows.forEach((row) => {
      row.productIds.forEach((productId, index) => {
        if (!productId || options.has(productId)) return;

        options.set(productId, {
          value: productId,
          label: row.productos[index] || `Producto ${index + 1}`,
        });
      });
    });

    return Array.from(options.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
    );
  }, [rows]);

  const productionTableFilters = useMemo<DataTableFilterTree>(() => {
    const warehouseFilterOptions = warehouseOptions
      .filter((option) => option.value)
      .map((option) => ({
        id: option.value,
        label: option.label,
      }));

    const statusFilterOptions = statusOptions
      .filter((option) => option.value !== "all")
      .map((option) => ({
        id: option.value,
        label: option.label,
      }));

    const productFilterOptions = productOptions.map((option) => ({
      id: option.value,
      label: option.label,
    }));

    return [
      {
        id: "warehouse",
        label: "Almacén",
        modes: [
          {
            id: "select",
            label: "Seleccionar",
            groups: [
              {
                id: "options",
                label: "Almacenes",
                searchable: true,
                options: warehouseFilterOptions,
              },
            ],
          },
        ],
      },
      {
        id: "status",
        label: "Estado",
        modes: [
          {
            id: "select",
            label: "Seleccionar",
            groups: [
              {
                id: "options",
                label: "Estados",
                options: statusFilterOptions,
              },
            ],
          },
        ],
      },
      {
        id: "product",
        label: "Producto",
        modes: [
          {
            id: "select",
            label: "Seleccionar",
            groups: [
              {
                id: "options",
                label: "Productos",
                searchable: true,
                options: productFilterOptions,
              },
            ],
          },
        ],
      },
    ];
  }, [productOptions, statusOptions, warehouseOptions]);

  const productionAppliedFilters = useMemo<AppliedDataTableFilter[]>(() => {
    const filters: AppliedDataTableFilter[] = [];

    if (warehouseId) {
      filters.push({
        id: "warehouse:select:options",
        categoryId: "warehouse",
        modeId: "select",
        groupId: "options",
        operator: "OR",
        optionIds: [warehouseId],
      });
    }

    if (statusFilter !== "all") {
      filters.push({
        id: "status:select:options",
        categoryId: "status",
        modeId: "select",
        groupId: "options",
        operator: "OR",
        optionIds: [statusFilter],
      });
    }

    if (selectedProductIds.length > 0) {
      filters.push({
        id: "product:select:options",
        categoryId: "product",
        modeId: "select",
        groupId: "options",
        operator: "OR",
        optionIds: selectedProductIds,
      });
    }

    return filters;
  }, [selectedProductIds, statusFilter, warehouseId]);

  const handleProductionFiltersChange = useCallback((next: AppliedDataTableFilter[]) => {
    const getFirstOption = (categoryId: string) =>
      next.find((item) => item.categoryId === categoryId)?.optionIds[0] ?? "";

    const getOptionIds = (categoryId: string) =>
      next.find((item) => item.categoryId === categoryId)?.optionIds ?? [];

    setWarehouseId(getFirstOption("warehouse"));
    setStatusFilter((getFirstOption("status") || "all") as "all" | ProductionStatus);
    setSelectedProductIds(getOptionIds("product"));
    setPage(1);
  }, []);

  const filteredRows = useMemo(() => {
    if (selectedProductIds.length === 0) return rows;

    return rows.filter((row) =>
      row.productIds.some((productId) => selectedProductIds.includes(productId)),
    );
  }, [rows, selectedProductIds]);

  const globalSearchFn = (row: ProductionRow, query: string) => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;

    const statusLabel = row.estado ? (statusLabels[row.estado] ?? "") : "";

    return [
      row.registro,
      row.serie,
      row.referencia,
      row.almacenOrigen,
      row.almacenDestino,
      row.termino,
      row.productos.join(" "),
      statusLabel,
    ].some((value) => normalizeSearchText(value).includes(normalizedQuery));
  };

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
                    disabled: companyActionDisabled,
                  },
                  {
                    id: "edit",
                    label: "Editar",
                    icon: <Pencil className="h-4 w-4 text-black/60" />,
                    hidden: order.status !== ProductionStatus.DRAFT,
                    onClick: () => handleEdit(order.productionId ?? ""),
                    disabled: companyActionDisabled,
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
                    disabled: companyActionDisabled,
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
                    disabled: companyActionDisabled,
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
  }, [companyActionDisabled, nowIso]);

  return (
    <PageShell className="bg-white">
      <PageTitle title="Produccion" />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Headed title="Ordenes de Produccion" size="lg" />
          <SystemButton
            size="md"
            className="w-full lg:w-auto"
            leftIcon={<Plus className="h-4 w-4" />}
            style={{
              backgroundColor: PRIMARY,
              borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
              boxShadow: "0 10px 25px -15px rgba(0,0,0,0.4)",
            }}
            onClick={handleCreate}
            disabled={companyActionDisabled}
            title={companyActionTitle}
          >
            Nueva orden
          </SystemButton>
        </div>

        <DataTable
          tableId="production-orders-table"
          data={filteredRows}
          columns={columns}
          rowKey="id"
          loading={loading}
          emptyMessage="No hay ordenes con los filtros actuales."
          hoverable={false}
          animated={false}
          selectableColumns
          showSearch
          searchPlaceholder="Buscar serie, referencia, almacén, producto o estado..."
          globalSearchFn={globalSearchFn}
          rangeDates={{
            startDate: parseDateInputValue(fromDate),
            endDate: parseDateInputValue(toDate),
            onChange: ({ startDate, endDate }) => {
              setFromDate(startDate ? toLocalDateKey(startDate) : "");
              setToDate(endDate ? toLocalDateKey(endDate) : "");
              setPage(1);
            },
          }}
          filtersConfig={{
            categories: productionTableFilters,
            value: productionAppliedFilters,
            onChange: handleProductionFiltersChange,
            emptyMessage: "Sin resultados.",
          }}
          pagination={{
            page,
            limit,
            total: pagination.total,
          }}
          onPageChange={setPage}
        />

        <PdfViewerModal
          open={openPdfModal}
          onClose={() => {
            setOpenPdfModal(false);
            setSelectedProductionId(null);
          }}
          title="Orden de produccion"
          loadWhen={Boolean(selectedProductionId)}
          reloadKey={selectedProductionId}
          getPdf={() => getProductionOrderPdf(selectedProductionId!)}
          primaryColor={PRIMARY}
        />

        <ProductionOrderFormModal
          open={openFormModal}
          mode={formMode}
          productionId={editingProductionId}
          onClose={handleCloseFormModal}
          onSaved={async () => {
            handleCloseFormModal();
            await loadOrders();
          }}
          primaryColor={PRIMARY}
        />
      </div>
    </PageShell>
  );
}
