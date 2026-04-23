import { useCallback, useEffect, useMemo, useState } from "react";
import { Timer, OctagonAlert, FileText, Pencil, Play, Ban, PackageCheck, Plus } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/components/table/search";
import { ActionsPopover } from "@/components/ActionsPopover";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { getApiErrorMessage } from "@/common/utils/apiError";
import { errorResponse, successResponse } from "@/common/utils/response";
import {
  cancelProductionOrder,
  closeProductionOrder,
  deleteProductionSearchMetric,
  getProductionOrder,
  getProductionSearchState,
  listProductionOrders,
  saveProductionSearchMetric,
  startProductionOrder,
} from "@/services/productionService";
import { getProductionOrderPdf } from "@/services/pdfServices";
import { parseDateInputValue, toLocalDateKey } from "@/utils/functionPurchases";
import type {
  ProductionOrder,
  ProductionSearchRule,
  ProductionSearchSnapshot,
  ProductionSearchStateResponse,
} from "@/pages/production/types/production";
import { ProductionStatus } from "@/pages/production/types/production";
import TimerToEnd from "@/components/TimerToEnd";
import { PdfViewerModal } from "@/components/ModalOpenPdf";
import { Headed } from "@/components/Headed";
import { PageShell } from "@/components/layout/PageShell";
import { SystemButton } from "@/components/SystemButton";
import { ProductionOrderDetailModal } from "@/pages/production/components/ProductionOrderDetailModal";
import { ProductionOrderFormModal } from "@/pages/production/components/ProductionOrderFormModal";
import { useCompany } from "@/hooks/useCompany";
import { ProductionSmartSearchPanel } from "@/pages/production/components/ProductionSmartSearchPanel";
import { AlertModal } from "@/components/AlertModal";
import {
  buildProductionSearchChips,
  buildProductionSmartSearchColumns,
  createEmptyProductionSearchFilters,
  hasProductionSearchCriteria,
  removeProductionSearchKey,
  sanitizeProductionSearchSnapshot,
  type ProductionSearchFilterKey,
  upsertProductionSearchRule,
} from "@/pages/production/utils/productionSmartSearch";

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
  const { hasCompany } = useCompany();
  const companyActionDisabled = !hasCompany;
  const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => createEmptyProductionSearchFilters());
  const [searchState, setSearchState] = useState<ProductionSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openPdfModal, setOpenPdfModal] = useState(false);
  const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);
  const [openFormModal, setOpenFormModal] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingProductionId, setEditingProductionId] = useState<string | undefined>(undefined);
  const [pendingStartOrder, setPendingStartOrder] = useState<ProductionOrder | null>(null);
  const [pendingCancelOrder, setPendingCancelOrder] = useState<ProductionOrder | null>(null);
  const [submittingAction, setSubmittingAction] = useState<"start" | "cancel" | null>(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [detailOrder, setDetailOrder] = useState<ProductionOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
  const [page, setPage] = useState(1);
  const limit = DEFAULT_LIMIT;
  const currentNowIso = new Date().toISOString();

  const draftSnapshot = useMemo(
    () =>
      sanitizeProductionSearchSnapshot({
        q: searchText,
        filters: searchFilters,
      }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo(
    () =>
      sanitizeProductionSearchSnapshot({
        q: appliedSearchText,
        filters: searchFilters,
      }),
    [appliedSearchText, searchFilters],
  );

  const loadSearchState = useCallback(async () => {
    try {
      const response = await getProductionSearchState();
      setSearchState(response);
    } catch {
      showFlash(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, [showFlash]);

  const submitSearch = useCallback(() => {
    setAppliedSearchText(searchText.trim());
    setPage(1);
  }, [searchText]);

  const loadOrders = useCallback(async () => {
    clearFlash();
    setLoading(true);

    try {
      const res = await listProductionOrders({
        page,
        limit,
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
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

      if (hasProductionSearchCriteria(executedSnapshot)) {
        void loadSearchState();
      }
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
  }, [clearFlash, executedSnapshot, fromDate, limit, loadSearchState, page, showFlash, toDate]);

  const handleStart = async (id: string) => {
    clearFlash();
    setSubmittingAction("start");
    try {
      const response = await startProductionOrder(id);
      showFlash(successResponse(response.message ?? "Orden iniciada"));
      setPendingStartOrder(null);
      await loadOrders();
    } catch (error) {
      showFlash(errorResponse(getApiErrorMessage(error, "Error al iniciar la orden")));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleClose = useCallback(async (id: string) => {
    clearFlash();
    try {
      const response = await closeProductionOrder(id);
      showFlash(successResponse(response.message ?? "Orden cerrada"));
      await loadOrders();
    } catch (error) {
      showFlash(errorResponse(getApiErrorMessage(error, "Error al cerrar la orden")));
    }
  }, [clearFlash, loadOrders, showFlash]);

  const handleCancel = async (id: string) => {
    clearFlash();
    setSubmittingAction("cancel");
    try {
      const response = await cancelProductionOrder(id);
      showFlash(successResponse(response.message ?? "Orden cancelada"));
      setPendingCancelOrder(null);
      await loadOrders();
    } catch (error) {
      showFlash(errorResponse(getApiErrorMessage(error, "Error al cancelar la orden")));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleEdit = useCallback((id: string) => {
    if (!id) return;
    setFormMode("edit");
    setEditingProductionId(id);
    setOpenFormModal(true);
  }, []);

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

  const openProductionPdf = useCallback((id: string) => {
    clearFlash();
    setSelectedProductionId(id);
    setOpenPdfModal(true);
  }, [clearFlash]);

  const handleOpenDetail = useCallback(async (order: ProductionOrder) => {
    const productionId = order.productionId ?? order.id;
    if (!productionId) return;

    clearFlash();
    setOpenDetailModal(true);
    setDetailLoading(true);
    setDetailOrder(order);

    try {
      const response = await getProductionOrder(productionId);
      setDetailOrder({
        ...order,
        ...response,
        serie: response.serie ?? order.serie ?? null,
        fromWarehouse: response.fromWarehouse ?? order.fromWarehouse ?? null,
        toWarehouse: response.toWarehouse ?? order.toWarehouse ?? null,
        items: response.items ?? order.items ?? [],
      });
    } catch (error) {
      showFlash(errorResponse(getApiErrorMessage(error, "Error al cargar el detalle de la orden")));
    } finally {
      setDetailLoading(false);
    }
  }, [clearFlash, showFlash]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

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
                    from={currentNowIso}
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
        stopRowClick: true,
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
                    onClick: () => setPendingStartOrder(order),
                    disabled: companyActionDisabled,
                  },
                  {
                    id: "close",
                    label: "Cerrar",
                    icon: <PackageCheck className="h-4 w-4 text-black/60" />,
                    hidden:
                      order.status !== ProductionStatus.IN_PROGRESS &&
                      order.status !== ProductionStatus.PARTIAL,
                    onClick: () => handleClose(order.productionId ?? ""),
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
                    label: "PDF",
                    icon: <FileText className="h-4 w-4 text-black/60" />,
                    onClick: () => openProductionPdf(order.productionId ?? ""),
                  },
                  {
                    id: "cancel",
                    label: "Cancelar",
                    icon: <Ban className="h-4 w-4 text-black/60" />,
                    hidden:
                      order.status === ProductionStatus.CANCELLED ||
                      order.status === ProductionStatus.COMPLETED,
                    onClick: () => setPendingCancelOrder(order),
                    disabled: companyActionDisabled,
                  },
                ]}
                columns={1}
                compact
                showLabels
              />
            </div>
          );
        },
      },
    ];
  }, [companyActionDisabled, currentNowIso, handleClose, handleEdit, loadOrders, openProductionPdf]);

  const smartSearchColumns = useMemo(
    () => buildProductionSmartSearchColumns(searchState),
    [searchState],
  );

  const recentSearches = useMemo<DataTableRecentSearchItem<ProductionSearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<ProductionSearchSnapshot>[]>(
    () =>
      (searchState?.saved ?? []).map((metric) => ({
        id: metric.metricId,
        name: metric.name,
        label: metric.label,
        snapshot: metric.snapshot,
      })),
    [searchState],
  );

  const searchChips = useMemo(
    () => buildProductionSearchChips(executedSnapshot, searchState),
    [executedSnapshot, searchState],
  );

  const applySmartSnapshot = useCallback((snapshot: ProductionSearchSnapshot) => {
    const normalized = sanitizeProductionSearchSnapshot(snapshot);
    setSearchText(normalized.q ?? "");
    setAppliedSearchText(normalized.q ?? "");
    setSearchFilters(normalized.filters);
    setPage(1);
  }, []);

  const handleApplySearchRule = useCallback((rule: ProductionSearchRule) => {
    setSearchFilters((current) => {
      const next = upsertProductionSearchRule(
        sanitizeProductionSearchSnapshot({ q: searchText, filters: current }),
        rule,
      );
      return next.filters;
    });
    setPage(1);
  }, [searchText]);

  const handleRemoveSearchRule = useCallback((fieldId: ProductionSearchFilterKey) => {
    setSearchFilters((current) => {
      const next = removeProductionSearchKey(
        sanitizeProductionSearchSnapshot({ q: searchText, filters: current }),
        fieldId,
      );
      return next.filters;
    });
    setPage(1);
  }, [searchText]);

  const handleRemoveChip = useCallback((key: "q" | ProductionSearchFilterKey) => {
    const nextSnapshot = removeProductionSearchKey(
      sanitizeProductionSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
      key,
    );
    setSearchText(nextSnapshot.q ?? "");
    setAppliedSearchText(nextSnapshot.q ?? "");
    setSearchFilters(nextSnapshot.filters);
    setPage(1);
  }, [appliedSearchText, searchFilters]);

  const handleSaveMetric = useCallback(async (name: string) => {
    const snapshot = sanitizeProductionSearchSnapshot({
      q: appliedSearchText,
      filters: searchFilters,
    });
    if (!hasProductionSearchCriteria(snapshot)) return false;

    setSavingMetric(true);
    try {
      const response = await saveProductionSearchMetric(name, snapshot);
      if (response.type === "success") {
        showFlash(successResponse(response.message));
        await loadSearchState();
        return true;
      }

      showFlash(errorResponse(response.message));
      return false;
    } catch {
      showFlash(errorResponse("Error al guardar la metrica"));
      return false;
    } finally {
      setSavingMetric(false);
    }
  }, [appliedSearchText, loadSearchState, searchFilters, showFlash]);

  const handleDeleteMetric = useCallback(async (metricId: string) => {
    try {
      const response = await deleteProductionSearchMetric(metricId);
      if (response.type === "success") {
        showFlash(successResponse(response.message));
        await loadSearchState();
      } else {
        showFlash(errorResponse(response.message));
      }
    } catch {
      showFlash(errorResponse("Error al eliminar la metrica"));
    }
  }, [loadSearchState, showFlash]);

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

        <DataTableSearchChips
          chips={searchChips}
          onRemove={(chip) => handleRemoveChip(chip.removeKey)}
        />

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
          toolbarSearchContent={
            <DataTableSearchBar
              value={searchText}
              onChange={setSearchText}
              onSubmitSearch={submitSearch}
              searchLabel="Busca tu orden"
              searchName="production-smart-search"
              canSaveMetric={hasProductionSearchCriteria(executedSnapshot)}
              saveLoading={savingMetric}
              onSaveMetric={handleSaveMetric}
            >
              <ProductionSmartSearchPanel
                recent={recentSearches}
                saved={savedMetrics}
                columns={smartSearchColumns}
                snapshot={draftSnapshot}
                searchState={searchState}
                filterQuery={searchText}
                onApplySnapshot={applySmartSnapshot}
                onApplyRule={handleApplySearchRule}
                onRemoveRule={handleRemoveSearchRule}
                onDeleteMetric={handleDeleteMetric}
              />
            </DataTableSearchBar>
          }
          rangeDates={{
            startDate: parseDateInputValue(fromDate),
            endDate: parseDateInputValue(toDate),
            onChange: ({ startDate, endDate }) => {
              setFromDate(startDate ? toLocalDateKey(startDate) : "");
              setToDate(endDate ? toLocalDateKey(endDate) : "");
              setPage(1);
            },
          }}
          pagination={{
            page,
            limit,
            total: pagination.total,
          }}
          onPageChange={setPage}
          onRowClick={(row) => {
            void handleOpenDetail(row.original);
          }}
        />

        <ProductionOrderDetailModal
          open={openDetailModal}
          onClose={() => {
            setOpenDetailModal(false);
            setDetailOrder(null);
            setDetailLoading(false);
          }}
          loading={detailLoading}
          order={detailOrder}
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

        <AlertModal
          open={Boolean(pendingStartOrder)}
          type="warning"
          title="Procesar orden de producción"
          message={
            pendingStartOrder
              ? `Estas seguro de procesar esta orden de produccion${pendingStartOrder.serie?.code ? ` ${pendingStartOrder.serie.code}-${pendingStartOrder.correlative ?? ""}` : ""}?`
              : ""
          }
          confirmText="Procesar"
          loading={submittingAction === "start"}
          onClose={() => {
            if (submittingAction === "start") return;
            setPendingStartOrder(null);
          }}
          onConfirm={() => {
            if (!pendingStartOrder?.productionId) return;
            void handleStart(pendingStartOrder.productionId);
          }}
        />

        <AlertModal
          open={Boolean(pendingCancelOrder)}
          type="warning"
          title="Cancelar orden de producción"
          message={
            pendingCancelOrder
              ? `Estas seguro de cancelar esta orden de produccion${pendingCancelOrder.serie?.code ? ` ${pendingCancelOrder.serie.code}-${pendingCancelOrder.correlative ?? ""}` : ""}?`
              : ""
          }
          confirmText="Cancelar orden"
          loading={submittingAction === "cancel"}
          onClose={() => {
            if (submittingAction === "cancel") return;
            setPendingCancelOrder(null);
          }}
          onConfirm={() => {
            if (!pendingCancelOrder?.productionId) return;
            void handleCancel(pendingCancelOrder.productionId);
          }}
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
