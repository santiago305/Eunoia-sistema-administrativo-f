import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Timer, OctagonAlert, FileText, Pencil, Play, Ban, PackageCheck, Plus } from "lucide-react";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { getApiErrorMessage } from "@/shared/common/utils/apiError";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import {
  cancelProductionOrder,
  closeProductionOrder,
  deleteProductionExportPreset,
  deleteProductionSearchMetric,
  exportProductionOrdersExcel,
  getProductionOrder,
  getProductionExportColumns,
  getProductionExportPresets,
  getProductionSearchState,
  listProductionOrders,
  saveProductionExportPreset,
  saveProductionSearchMetric,
  startProductionOrder,
} from "@/shared/services/productionService";
import { getProductionOrderPdf } from "@/shared/services/pdfServices";
import { parseDateInputValue, toLocalDateKey } from "@/shared/utils/functionPurchases";
import type {
  ProductionExportColumn,
  ProductionOrder,
  ProductionSearchRule,
  ProductionSearchSnapshot,
  ProductionSearchStateResponse,
} from "@/features/production/types/production";
import { ExportPopover } from "@/shared/components/components/ExportPopover";
import { ProductionStatus } from "@/features/production/types/production";
import TimerToEnd from "@/shared/components/components/TimerToEnd";
import { PdfViewerModal } from "@/shared/components/components/ModalOpenPdf";
import { Headed } from "@/shared/components/components/Headed";
import { PageShell } from "@/shared/layouts/PageShell";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { ProductionOrderDetailModal } from "@/features/production/components/ProductionOrderDetailModal";
import { ProductionOrderFormModal } from "@/features/production/components/ProductionOrderFormModal";
import { useCompany } from "@/shared/hooks/useCompany";
import { useAuth } from "@/shared/hooks/useAuth";
import { ProductionSmartSearchPanel } from "@/features/production/components/ProductionSmartSearchPanel";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { ExtraTimeModal } from "@/features/production/components/ExtraTimeModal";
import { ProductionCompletionPhotoModal } from "@/features/production/components/ProductionCompletionPhotoModal";
import { addProductionExtraTime, uploadProductionImageProdution } from "@/features/production/utils/productionActions";
import {
  buildProductionSearchChips,
  buildProductionSmartSearchColumns,
  createEmptyProductionSearchFilters,
  hasProductionSearchCriteria,
  removeProductionSearchKey,
  sanitizeProductionSearchSnapshot,
  type ProductionSearchFilterKey,
  upsertProductionSearchRule,
} from "@/features/production/utils/productionSmartSearch";

const PRIMARY = "hsl(var(--primary))";
const DEFAULT_LIMIT = 10;
const PHOTO_MODAL_SKIP_KEY = "production-photo-modal-skipped";

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
  usuario: string;
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
    hour12: false,
  });
};

export default function Production() {
  const { showFlash, clearFlash } = useFlashMessage();
  const showFlashRef = useRef(showFlash);
  useEffect(() => { showFlashRef.current = showFlash; }, [showFlash]);
  const { hasCompany } = useCompany();
  const { userRole } = useAuth();
  const companyActionDisabled = !hasCompany;
  const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => createEmptyProductionSearchFilters());
  const [searchState, setSearchState] = useState<ProductionSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [exportColumns, setExportColumns] = useState<ProductionExportColumn[]>([]);
  const [exportPresets, setExportPresets] = useState<Array<{ metricId: string; name: string; columns: ProductionExportColumn[] }>>([]);
  const [exporting, setExporting] = useState(false);
  const [useTableDateRangeForExport, setUseTableDateRangeForExport] = useState(true);
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
  const [extraTimeProductionId, setExtraTimeProductionId] = useState<string | null>(null);
  const [extraTimeLoading, setExtraTimeLoading] = useState(false);
  const [completedPhotoOrder, setCompletedPhotoOrder] = useState<ProductionOrder | null>(null);
  const [completedPhotoLoading, setCompletedPhotoLoading] = useState(false);
  const skippedPhotoRef = useRef<Set<string>>(new Set());

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

  const isPhotoPromptSkipped = useCallback((productionId?: string) => {
    if (!productionId) return false;
    try {
      const raw = localStorage.getItem(PHOTO_MODAL_SKIP_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return Boolean(parsed[productionId]);
    } catch {
      return false;
    }
  }, []);

  const markPhotoPromptSkipped = useCallback((productionId?: string) => {
    if (!productionId) return;
    try {
      const raw = localStorage.getItem(PHOTO_MODAL_SKIP_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      parsed[productionId] = true;
      localStorage.setItem(PHOTO_MODAL_SKIP_KEY, JSON.stringify(parsed));
    } catch {
      // no-op
    }
  }, []);

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
      showFlashRef.current(errorResponse("Error al cargar el estado del buscador inteligente"));
    }
  }, []);

  const loadExportColumns = useCallback(async () => {
    try {
      const response = await getProductionExportColumns();
      setExportColumns(response ?? []);
    } catch {
      showFlashRef.current(errorResponse("Error al cargar columnas de exportacion"));
    }
  }, []);

  const loadExportPresets = useCallback(async () => {
    try {
      const response = await getProductionExportPresets();
      setExportPresets((response ?? []).map((item) => ({
        metricId: item.metricId,
        name: item.name,
        columns: (item.snapshot?.columns ?? []) as ProductionExportColumn[],
      })));
    } catch {
      showFlashRef.current(errorResponse("Error al cargar presets de exportacion"));
    }
  }, []);

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
      showFlashRef.current(errorResponse("Error al listar producciones"));
    } finally {
      setLoading(false);
    }
  }, [executedSnapshot, fromDate, limit, loadSearchState, page, toDate]);

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

  const handleAddExtraTime = useCallback(async (values: { days: number; hours: number; minutes: number }) => {
    if (!extraTimeProductionId) return;
    setExtraTimeLoading(true);
    try {
      const res = await addProductionExtraTime(extraTimeProductionId, values);
      if (res.type === "success") {
        showFlash(successResponse(res.message));
        setExtraTimeProductionId(null);
        await loadOrders();
      } else {
        showFlash(errorResponse(res.message));
      }
    } catch (error) {
      showFlash(errorResponse(getApiErrorMessage(error, "Error al agregar tiempo extra")));
    } finally {
      setExtraTimeLoading(false);
    }
  }, [extraTimeProductionId, loadOrders, showFlash]);

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
        createdBy: response.createdBy ?? order.createdBy,
        createdByName: response.createdByName ?? order.createdByName ?? null,
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

  const handleUploadCompletedPhoto = useCallback(async (file: File) => {
    const productionId = completedPhotoOrder?.productionId ?? completedPhotoOrder?.id;
    if (!productionId) return;
    setCompletedPhotoLoading(true);
    try {
      const res = await uploadProductionImageProdution(productionId, file);
      if (res.type === "success") {
        skippedPhotoRef.current.add(productionId);
        showFlash(successResponse(res.message));
        setCompletedPhotoOrder(null);
        await loadOrders();
      } else {
        showFlash(errorResponse(res.message));
      }
    } catch (error) {
      showFlash(errorResponse(getApiErrorMessage(error, "No se pudo subir la foto de producción")));
    } finally {
      setCompletedPhotoLoading(false);
    }
  }, [completedPhotoOrder?.id, completedPhotoOrder?.productionId, loadOrders, showFlash]);

  const handleSkipCompletedPhoto = useCallback(async () => {
    const productionId = completedPhotoOrder?.productionId ?? completedPhotoOrder?.id;
    if (productionId) {
      skippedPhotoRef.current.add(productionId);
      markPhotoPromptSkipped(productionId);
    }
    setCompletedPhotoOrder(null);
    showFlash(successResponse("Producción ingresada sin foto. Se puede subir luego desde detalle (admin)."));
  }, [completedPhotoOrder?.id, completedPhotoOrder?.productionId, markPhotoPromptSkipped, showFlash]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);
  useEffect(() => {
    void loadExportColumns();
    void loadExportPresets();
  }, [loadExportColumns, loadExportPresets]);

  useEffect(() => {
    if (completedPhotoOrder) return;
    const candidate = orders.find((order) => {
      const productionId = order.productionId ?? order.id;
      return (
        order.status === ProductionStatus.COMPLETED &&
        (!order.imageProdution || order.imageProdution.length === 0) &&
        !!productionId &&
        !skippedPhotoRef.current.has(productionId) &&
        !isPhotoPromptSkipped(productionId)
      );
    });
    if (candidate) setCompletedPhotoOrder(candidate);
  }, [completedPhotoOrder, isPhotoPromptSkipped, orders]);

  const rows = useMemo<ProductionRow[]>(() => {
    return (orders ?? []).map((order) => ({
      id:
        order.productionId ??
        `${order.fromWarehouseId}-${order.toWarehouseId}-${order.createdAt ?? ""}`,
      registro: formatDateTime(order.createdAt),
      serie: order.serie?.code ? `${order.serie.code} - ${order.correlative}` : "-",
      referencia: order.reference || "-",
      usuario: order.createdByName ?? order.createdBy ?? "-",
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
        header: "Emision",
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
        id: "usuario",
        header: "Usuario",
        accessorKey: "usuario",
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
        headerClassName: "text-center [&>div]:justify-center",
        className: "text-center",
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
        headerClassName: "text-center [&>div]:justify-center",
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
                <span className="flex items-center rounded-lg gap-2 p-1 text-[10px] font-medium bg-slate-50 text-slate-700">
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
        headerClassName: "text-center [&>div]:justify-center",
        className: "text-center",
        accessorKey: "termino",
      },
      {
        id: "actions",
        header: "Acciones",
        headerClassName: "text-center [&>div]:justify-center",
        stopRowClick: true,
        cell: (row) => {
          const order = row.original;

          return (
            <div className="flex justify-center">
              <ActionsPopover
                itemClassName="justify-start"
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
                    label: "Ingresar Almacen",
                    icon: <PackageCheck className="h-4 w-4 text-black/60" />,
                    hidden:
                      order.status !== ProductionStatus.IN_PROGRESS &&
                      order.status !== ProductionStatus.PARTIAL,
                    onClick: () => handleClose(order.productionId ?? ""),
                    disabled: companyActionDisabled,
                  },
                  {
                    id: "extra-time",
                    label: "Tiempo extra",
                    icon: <Timer className="h-4 w-4 text-black/60" />,
                    hidden: order.status !== ProductionStatus.IN_PROGRESS,
                    onClick: () => setExtraTimeProductionId(order.productionId ?? ""),
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

  const handleExport = useCallback(async (columnsToExport: ProductionExportColumn[]) => {
    setExporting(true);
    try {
      const file = await exportProductionOrdersExcel({
        columns: columnsToExport,
        q: executedSnapshot.q,
        filters: executedSnapshot.filters as unknown as Record<string, unknown>[],
        from: fromDate || undefined,
        to: toDate || undefined,
        useDateRange: useTableDateRangeForExport,
      });
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      showFlash(successResponse("Excel exportado correctamente"));
    } catch {
      showFlash(errorResponse("No se pudo exportar el Excel"));
    } finally {
      setExporting(false);
    }
  }, [executedSnapshot.filters, executedSnapshot.q, fromDate, showFlash, toDate, useTableDateRangeForExport]);

  const handleSaveExportPreset = useCallback(async (payload: { name: string; columns: ProductionExportColumn[] }) => {
    await saveProductionExportPreset({
      name: payload.name,
      columns: payload.columns,
      useDateRange: useTableDateRangeForExport,
    });
    await loadExportPresets();
    showFlash(successResponse("Preset de exportacion guardado"));
  }, [loadExportPresets, showFlash, useTableDateRangeForExport]);

  const handleDeleteExportPreset = useCallback(async (metricId: string) => {
    await deleteProductionExportPreset(metricId);
    await loadExportPresets();
    showFlash(successResponse("Preset eliminado"));
  }, [loadExportPresets, showFlash]);

  return (
    <PageShell className="bg-white">
      <PageTitle title="Produccion" />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Headed title="Ordenes de Produccion" size="lg" />
          <div className="flex items-center gap-2">
            {exportColumns.length ? (
              <ExportPopover
                columns={exportColumns}
                loading={exporting}
                presets={exportPresets}
                onSavePreset={handleSaveExportPreset}
                onDeletePreset={handleDeleteExportPreset}
                onExport={handleExport}
              />
            ) : null}
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
          useRangeDatesForExternalExport
          onExternalExportRangeStateChange={(state) => {
            setUseTableDateRangeForExport(state.useDateRange);
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
          canAdminUploadMissingPhoto={(userRole ?? "").toLowerCase() === "admin"}
          onUploadedPhoto={async () => {
            const id = detailOrder?.productionId ?? detailOrder?.id;
            if (!id) return;
            const response = await getProductionOrder(id);
            setDetailOrder((prev) => prev ? { ...prev, ...response, items: response.items ?? prev.items } : response);
            await loadOrders();
          }}
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
        <ExtraTimeModal
          open={Boolean(extraTimeProductionId)}
          loading={extraTimeLoading}
          onClose={() => setExtraTimeProductionId(null)}
          onConfirm={handleAddExtraTime}
        />
        <ProductionCompletionPhotoModal
          open={Boolean(completedPhotoOrder)}
          loading={completedPhotoLoading}
          onClose={() => setCompletedPhotoOrder(null)}
          onConfirm={handleUploadCompletedPhoto}
          onCancelWithoutPhoto={handleSkipCompletedPhoto}
        />
      </div>
    </PageShell>
  );
}
