  import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent  } from "react";
  import { BanknoteArrowUp, FileText, Menu, Pencil, Plus, Sheet, Truck, XCircle } from "lucide-react";
  import { DataTable } from "@/shared/components/table/DataTable";
  import type { DataTableColumn } from "@/shared/components/table/types";
  import { PageShell } from "@/shared/layouts/PageShell";
  import { SystemButton } from "@/shared/components/components/SystemButton";
  import { SaleOrderModal } from "@/features/sale-orders/components/SaleOrderModal";
  import { AgendaStatus, ClientType, DeliveryStatus, DeliveryTypeEnum, type SaleOrder, type SaleOrderJsonImportRow, type SaleOrderSearchSnapshot, type SaleOrderSearchStateResponse } from "@/features/sale-orders/types/saleOrder";
  import {
    cancelSaleOrder,
    confirmSaleOrderDelivery,
    deleteSaleOrderSearchMetric,
    fetchSaleOrderById,
    getSaleOrderPdf,
    getSaleOrderSearchState,
    listSaleOrders,
    previewSaleOrdersJsonImport,
    saveSaleOrderSearchMetric,
  } from "@/shared/services/saleOrderService";
  import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
  import { errorResponse, successResponse } from "@/shared/common/utils/response";
  import { SaleOrderSmartSearchPanel } from "@/features/sale-orders/components/SaleOrderSmartSearchPanel";
  import {
    buildSaleOrderSearchChips,
    buildSaleOrderSmartSearchColumns,
    createEmptySaleOrderSearchFilters,
    hasSaleOrderSearchCriteria,
    removeSaleOrderSearchKey,
    sanitizeSaleOrderSearchSnapshot,
    upsertSaleOrderSearchRule,
    type SaleOrderSearchFilterKey,
  } from "@/features/sale-orders/utils/saleOrderSmartSearch";
  import { DataTableSearchBar, DataTableSearchChips, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
  import { SaleOrderDetailsModal } from "@/features/sale-orders/components/SaleOrderDetailsModal";
  import { useCompany } from "@/shared/hooks/useCompany";
  import { ActionsPopover, ActionItem } from "@/shared/components/components/ActionsPopover";
  import { PdfViewerModal } from "@/shared/components/components/ModalOpenPdf";
  import { createNotificationSocket } from "@/shared/lib/socket";
  import { useAuth } from "@/shared/hooks/useAuth";
  import { AlertModal } from "@/shared/components/components/AlertModal";
  import { parseApiError } from "@/shared/common/utils/handleApiError";
  import { SaleOrderPaymentsOrderModal } from "@/features/sale-orders/components/SaleOrderPaymentsOrderModal";
  import { ExcelImportModal, type ImportField } from "@/shared/components/importer";

  const saleOrderImportFields: ImportField[] = [
    { key: "productName", label: "Producto", aliases: ["producto", "product", "product name", "nombre producto"] },
    { key: "orderDate", label: "Fecha de pedido", type: "date", aliases: ["fecha pedido", "order date", "fecha orden"] },
    { key: "deliveryDate", label: "Fecha de entrega", type: "date", aliases: ["fecha entrega", "delivery date"] },
    { key: "deliveryType", label: "Tipo de entrega", aliases: ["tipo entrega", "delivery type"] },
    { key: "departmentName", label: "Departamento", required: true, aliases: ["departamento", "department"] },
    { key: "provinceName", label: "Provincia", required: true, aliases: ["provincia", "province"] },
    { key: "districtName", label: "Distrito", required: true, aliases: ["distrito", "district"] },
    { key: "recipientName", label: "Destinatario", required: true, aliases: ["destinatario", "recipient", "recipient name", "cliente"] },
    { key: "address", label: "Direccion", aliases: ["direccion", "dirección", "address"] },
    { key: "deliveryNote", label: "Nota de entrega", aliases: ["nota entrega", "delivery note", "observacion", "observación"] },
    { key: "phone", label: "Telefono", required: true, aliases: ["telefono", "teléfono", "phone", "celular"] },
    { key: "couponCode", label: "Cupon", aliases: ["cupon", "cupón", "coupon", "coupon code"] },
    { key: "productCodes", label: "Codigos de producto", required: true, aliases: ["codigos producto", "códigos producto", "product codes", "sku", "eva"] },
    { key: "quantity", label: "Cantidad", type: "number", aliases: ["cantidad", "qty", "quantity"] },
    { key: "total", label: "Total", required: true, type: "number", aliases: ["total", "importe"] },
    { key: "advance", label: "Adelanto", type: "number", aliases: ["adelanto", "advance"] },
    { key: "codAmount", label: "Contra entrega", type: "number", aliases: ["contra entrega", "cod", "cod amount"] },
    { key: "internalNote", label: "Nota interna", aliases: ["nota interna", "internal note", "fuente", "source"] },
    { key: "confirmedBy", label: "Confirmado por", aliases: ["confirmado por", "confirmed by"] },
  ];

  const optionalSaleOrderImportFields = new Set<keyof SaleOrderJsonImportRow>([
    "productName",
    "orderDate",
    "deliveryDate",
    "deliveryType",
    "address",
    "deliveryNote",
    "couponCode",
    "quantity",
    "advance",
    "codAmount",
    "internalNote",
    "confirmedBy",
  ]);

  const sanitizeSaleOrderImportRows = (rows: SaleOrderJsonImportRow[]): SaleOrderJsonImportRow[] => {
    return rows.map((row) => {
      const next = { ...row };

      optionalSaleOrderImportFields.forEach((key) => {
        if (next[key] === "") {
          delete next[key];
        }
      });

      return next;
    });
  };

  export default function SaleOrders() {
    const { showFeedback, clearFeedback } = useFeedbackToast();
    const showFeedbackRef = useRef(showFeedback);
    useEffect(() => {
      showFeedbackRef.current = showFeedback;
    }, [showFeedback]);
    
    const { hasCompany } = useCompany();
    const companyActionDisabled = !hasCompany;
    const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

    const { isAuthenticated, userId } = useAuth();

    const [open, setOpen] = useState(false);
    const openModal = useCallback(() => {
      setEditOrderId(null);
      setOpen(true);
    }, []);  
    const closeModal = useCallback(() => {
      setOpen(false);
      setEditOrderId(null);
    }, []);
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<SaleOrder[]>([]);
    const [searchState, setSearchState] = useState<SaleOrderSearchStateResponse | null>(null);
    const [savingMetric, setSavingMetric] = useState(false);
    const [editOrderId, setEditOrderId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);
    const [paymentsOpen, setPaymentsOpen] = useState(false);
    const [paymentsOrderId, setPaymentsOrderId] = useState<string | null>(null);
    const [paymentsOrderLabel, setPaymentsOrderLabel] = useState<string | null>(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [confirmDeliveryOpen, setConfirmDeliveryOpen] = useState(false);
    const [confirmDeliveryOrderId, setConfirmDeliveryOrderId] = useState<string | null>(null);
    const [confirmDeliveryLoading, setConfirmDeliveryLoading] = useState(false);

    const DEFAULT_LIMIT = 10;
    const [serverPagination, setServerPagination] = useState({
      total: 0,
      page: 1,
      limit: DEFAULT_LIMIT,
      totalPages: 1,
      hasPrev: false,
      hasNext: false,
    });

    const [paginationState, setPaginationState] = useState({
      pageIndex: 0,
      pageSize: DEFAULT_LIMIT,
    });

    const page = paginationState.pageIndex + 1;

    const [searchText, setSearchText] = useState("");
    const [appliedSearchText, setAppliedSearchText] = useState("");
    const [searchFilters, setSearchFilters] = useState(() => createEmptySaleOrderSearchFilters());
    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfOrderId, setPdfOrderId] = useState<string | null>(null);
    const [importLoading, setImportLoading] = useState(false);
    const [importOpen, setImportOpen] = useState(false);



    const draftSnapshot = useMemo(
      () =>
        sanitizeSaleOrderSearchSnapshot({
          q: searchText,
          filters: searchFilters,
        }),
      [searchFilters, searchText],
    );

    const executedSnapshot = useMemo(
      () =>
        sanitizeSaleOrderSearchSnapshot({
          q: appliedSearchText,
          filters: searchFilters,
        }),
      [appliedSearchText, searchFilters],
    );

    const smartSearchColumns = useMemo(() => buildSaleOrderSmartSearchColumns(searchState), [searchState]);

    const recentSearches = useMemo<DataTableRecentSearchItem<SaleOrderSearchSnapshot>[]>(() => {
      return (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      }));
    }, [searchState]);

    const savedMetrics = useMemo<DataTableSavedSearchItem<SaleOrderSearchSnapshot>[]>(() => {
      return (searchState?.saved ?? []).map((metric) => ({
        id: metric.metricId,
        name: metric.name,
        label: metric.label,
        snapshot: metric.snapshot,
      }));
    }, [searchState]);

    const searchChips = useMemo(() => buildSaleOrderSearchChips(executedSnapshot, searchState), [executedSnapshot, searchState]);

    const submitSearch = useCallback(() => {
      startTransition(() => {
        setAppliedSearchText(searchText.trim());
        setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      });
    }, [searchText]);

    const handleSearchTextChange = useCallback((value: string) => {
      startTransition(() => setSearchText(value));
    }, []);

    const loadSearchState = useCallback(async () => {
      try {
        const response = await getSaleOrderSearchState();
        setSearchState(response);
      } catch {
        showFeedbackRef.current(errorResponse("Error al cargar el estado del buscador inteligente."));
      }
    }, []);

    const loadOrders = useCallback(async () => {
      clearFeedback();
      setLoading(true);
      try {
        const res = await listSaleOrders({
          page,
          limit: paginationState.pageSize,
          q: executedSnapshot.q,
          filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
        });

        const items = res.items ?? [];
        const nextTotal = res.total ?? 0;
        const nextPage = res.page ?? page;
        const nextLimit = res.limit ?? paginationState.pageSize;
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / nextLimit));

        setOrders(items);
        setServerPagination({
          total: nextTotal,
          page: nextPage,
          limit: nextLimit,
          totalPages: nextTotalPages,
          hasPrev: nextPage > 1,
          hasNext: nextPage < nextTotalPages,
        });

        if (hasSaleOrderSearchCriteria(executedSnapshot)) {
          void loadSearchState();
        }
      } catch {
        setOrders([]);
        setServerPagination({
          total: 0,
          page: 1,
          limit: paginationState.pageSize,
          totalPages: 1,
          hasPrev: false,
          hasNext: false,
        });
        showFeedbackRef.current(errorResponse("Error al listar pedidos."));
      } finally {
        setLoading(false);
      }
    }, [clearFeedback, executedSnapshot, loadSearchState, page, paginationState.pageSize]);

    useEffect(() => {
      void loadOrders();
    }, [loadOrders]);

    type SaleOrdersUpdatedPayload = {
      date: string;
      updated: number;
      saleOrderIds: string[];
    };

    const lastRealtimeRefreshRef = useRef(0);

    useEffect(() => {
      if (!isAuthenticated || !userId) return;

      const socket = createNotificationSocket(userId);
      if (!socket) return;

      const onSaleOrdersUpdated = (payload: SaleOrdersUpdatedPayload) => {
        const now = Date.now();
        if (now - lastRealtimeRefreshRef.current < 800) return;
        lastRealtimeRefreshRef.current = now;

        void loadOrders();

        const saleOrderIds = Array.isArray(payload?.saleOrderIds) ? payload.saleOrderIds : [];
        if (!detailOpen || !selectedOrder?.id || saleOrderIds.length === 0) return;
        if (!saleOrderIds.includes(selectedOrder.id)) return;

        void fetchSaleOrderById(selectedOrder.id)
          .then((updated) => {
            setSelectedOrder(updated);
          })
          .catch(() => {
            // Mantiene el detalle actual si falla el refresco.
          });
      };

      socket.on("sale-orders.updated", onSaleOrdersUpdated);
      return () => {
        socket.off("sale-orders.updated", onSaleOrdersUpdated);
      };
    }, [detailOpen, isAuthenticated, loadOrders, selectedOrder?.id, userId]);

    useEffect(() => {
      void loadSearchState();
    }, [loadSearchState]);

    const applySmartSnapshot = useCallback((snapshot: SaleOrderSearchSnapshot) => {
      const normalized = sanitizeSaleOrderSearchSnapshot(snapshot);
      startTransition(() => {
        setSearchText(normalized.q ?? "");
        setAppliedSearchText(normalized.q ?? "");
        setSearchFilters(normalized.filters);
        setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
      });
    }, []);

    const handleImportPreview = async (data: SaleOrderJsonImportRow[]) => {
      setImportLoading(true);
      try {
        const response = await previewSaleOrdersJsonImport(sanitizeSaleOrderImportRows(data));
        const baseMessage = `Importados: ${response.importedRows}. Fallidos: ${response.failedRows}.`;
        const errorDetails = response.errors
          .slice(0, 3)
          .map((error) => `Fila ${error.rowNumber}: ${error.message}`)
          .join(" ");

        showFeedbackRef.current(
          response.failedRows > 0
            ? errorResponse(errorDetails ? `${baseMessage} ${errorDetails}` : baseMessage)
            : successResponse(baseMessage),
        );
        await loadOrders();
      } catch (error) {
        showFeedbackRef.current(errorResponse(parseApiError(error)));
      }
      finally {setImportLoading(false);}
    };

    const handleApplySearchRule = useCallback(
      (rule: any) => {
        startTransition(() => {
          setSearchFilters((current: any) => {
            const next = upsertSaleOrderSearchRule(sanitizeSaleOrderSearchSnapshot({ q: searchText, filters: current }), rule);
            return next.filters;
          });
          setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
        });
      },
      [searchText],
    );

    const handleRemoveSearchRule = useCallback(
      (fieldId: SaleOrderSearchFilterKey) => {
        startTransition(() => {
          setSearchFilters((current: any) => {
            const next = removeSaleOrderSearchKey(sanitizeSaleOrderSearchSnapshot({ q: searchText, filters: current }), fieldId);
            return next.filters;
          });
          setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
        });
      },
      [searchText],
    );

    const handleRemoveChip = useCallback(
      (key: "q" | SaleOrderSearchFilterKey) => {
        const nextSnapshot = removeSaleOrderSearchKey(
          sanitizeSaleOrderSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
          key,
        );
        startTransition(() => {
          setSearchText(nextSnapshot.q ?? "");
          setAppliedSearchText(nextSnapshot.q ?? "");
          setSearchFilters(nextSnapshot.filters);
          setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
        });
      },
      [appliedSearchText, searchFilters],
    );

    const handlePageChange = useCallback((nextPage: number) => {
      startTransition(() => setPaginationState((prev) => ({ ...prev, pageIndex: Math.max(0, nextPage - 1) })));
    }, []);

    const handleSaveMetric = useCallback(
      async (name: string) => {
        const snapshot = sanitizeSaleOrderSearchSnapshot({ q: appliedSearchText, filters: searchFilters });
        if (!hasSaleOrderSearchCriteria(snapshot)) return false;

        setSavingMetric(true);
        try {
          const response = await saveSaleOrderSearchMetric(name, snapshot);
          if (response.type === "success") {
            showFeedback(successResponse(response.message));
            await loadSearchState();
            return true;
          }
          showFeedback(errorResponse(response.message));
          return false;
        } catch {
          showFeedback(errorResponse("Error al guardar la metrica."));
          return false;
        } finally {
          setSavingMetric(false);
        }
      },
      [appliedSearchText, loadSearchState, searchFilters, showFeedback],
    );

    const handleDeleteMetric = useCallback(
      async (metricId: string) => {
        try {
          const response = await deleteSaleOrderSearchMetric(metricId);
          if (response.type === "success") {
            showFeedback(successResponse(response.message));
            await loadSearchState();
          } else {
            showFeedback(errorResponse(response.message));
          }
        } catch {
          showFeedback(errorResponse("Error al eliminar la metrica."));
        }
      },
      [loadSearchState, showFeedback],
    );

    const handleCancelSaleOrder = useCallback(async () => {
      if (!cancelOrderId) return;
      setCancelLoading(true);
      try {
        await cancelSaleOrder(cancelOrderId);
        showFeedback(successResponse("Pedido cancelado."));
        setCancelOpen(false);
        setCancelOrderId(null);
        await loadOrders();

        if (detailOpen && selectedOrder?.id === cancelOrderId) {
          const updated = await fetchSaleOrderById(cancelOrderId);
          setSelectedOrder(updated);
        }
      } catch (err) {
        showFeedback(errorResponse(parseApiError(err)));
      } finally {
        setCancelLoading(false);
      }
    }, [cancelOrderId, detailOpen, loadOrders, selectedOrder?.id, showFeedback]);

    const handleConfirmDelivery = useCallback(async () => {
      if (!confirmDeliveryOrderId) return;
      setConfirmDeliveryLoading(true);
      try {
        await confirmSaleOrderDelivery(confirmDeliveryOrderId);
        showFeedback(successResponse("Entrega confirmada."));
        setConfirmDeliveryOpen(false);
        setConfirmDeliveryOrderId(null);
        await loadOrders();

        if (detailOpen && selectedOrder?.id === confirmDeliveryOrderId) {
          const updated = await fetchSaleOrderById(confirmDeliveryOrderId);
          setSelectedOrder(updated);
        }
      } catch (err) {
        showFeedback(errorResponse(parseApiError(err)));
      } finally {
        setConfirmDeliveryLoading(false);
      }
    }, [confirmDeliveryOrderId, detailOpen, loadOrders, selectedOrder?.id, showFeedback]);
    
    const columns = useMemo<DataTableColumn<SaleOrder>[]>(() => {
      const formatClientLabel = (client: SaleOrder["client"]) => {
        if (!client) return "-";
        const docValue = (client.docNumber ?? client.reference ?? "").trim();
        const docOrRef = docValue ? `(${docValue})` : "";
        return (
          <span className="block min-w-0">
            <span className="block truncate">
              {client.fullName} {docOrRef}
            </span>
            <span className="mt-0.5 block truncate text-[9px] text-black/40">
              {clientTypeBadge(client.type, client.count)}
            </span>
          </span>
        );
      };

      const formatMoney = (value: number) => {
        try {
          return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
        } catch {
          return `S/ ${(Number(value) || 0).toFixed(2)}`;
        }
      };
      const statusBadge = (label: string, className: string) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${className}`}>
          {label}
        </span>
      );
      const agendaStatusBadge = (status?: SaleOrder["agendaStatus"]) => {
        if (status === AgendaStatus.COORDINATED) return statusBadge("Coordinado", "bg-sky-50 text-sky-700 ring-sky-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        if (status === AgendaStatus.PROGRAMMED) return statusBadge("Programado", "bg-violet-50 text-violet-700 ring-violet-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        if (status === AgendaStatus.CANCELED) return statusBadge("Cancelado", "bg-rose-50 text-rose-700 ring-rose-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        return statusBadge("-", "bg-slate-50 text-slate-500 ring-slate-200");
      };
      const clientTypeBadge = (type?: ClientType | null, count?: number) => {
        if (type === ClientType.NEW) return statusBadge(`Nuevo${count ? ` (${count})` : ""}`, "bg-sky-50 text-sky-700 ring-sky-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        if (type === ClientType.LAGGING) return statusBadge(`Rezagado${count ? ` (${count})` : ""}`, "bg-amber-50 text-amber-700 ring-amber-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        if (type === ClientType.REPURCHASE) return statusBadge(`Recompra${count ? ` (${count})` : ""}`, "bg-emerald-50 text-emerald-700 ring-emerald-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        if (type === ClientType.UNDEFINED) return statusBadge(`Sin definir${count ? ` (${count})` : ""}`, "bg-slate-50 text-slate-500 ring-slate-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        return statusBadge("-", "bg-slate-50 text-slate-500 ring-slate-200");
      };
      const deliveryStatusBadge = (status?: SaleOrder["deliveryStatus"]) => {
        if (status === DeliveryStatus.WAITING) return statusBadge("En espera", "bg-amber-50 text-amber-700 ring-amber-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        if (status === DeliveryStatus.IN_PROGRESS) return statusBadge("En ruta", "bg-blue-50 text-blue-700 ring-blue-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        if (status === DeliveryStatus.DELIVERED) return statusBadge("Entregado", "bg-emerald-50 text-emerald-700 ring-emerald-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        if (status === DeliveryStatus.CANCELED) return statusBadge("Cancelado", "bg-rose-50 text-rose-700 ring-rose-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        return statusBadge("-", "bg-slate-50 text-slate-500 ring-slate-200");
      };

      const deliveryTypeBadge = (type?: SaleOrder["deliveryType"]) => {
        if (type === DeliveryTypeEnum.CONTRA_ENTREGA) return statusBadge("Envio CE", "bg-emerald-50 text-emerald-700 ring-emerald-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        if (type === DeliveryTypeEnum.ABONADO_ENVIO) return statusBadge("Envi­o A", "bg-cyan-50 text-cyan-700 ring-cyan-200 rounded-md px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset");
        return statusBadge("-", "bg-slate-50 text-slate-500 ring-slate-200");
      };

      return [
        {
          id: "numero",
          header: "Pedido",
          className: "text-black/70",
          cell: (row) => (
            <span className="font-semibold tabular-nums">
              {(row.serie ?? "-")}-{row.correlative ?? "-"}
            </span>
          ),
        },
        {
          id: "scheduleDate",
          header: "Agenda",
          className: "text-black/100",
          cell: (row) => <span className="tabular-nums text-[9px]">{row.scheduleDate ?? "-"}</span>,
        },
        {
          id: "deliveryDate",
          header: "Entrega",
          className: "text-black/100",
          cell: (row) => <span className="tabular-nums text-[9px]">{row.deliveryDate ?? "-"}</span>,
        },
        {
          id: "createdBy",
          header: "Usuario",
          className: "text-black/70",
          cell: (row) => (
            <span className="truncate">
              {row.createdBy ? `${row.createdBy.email}` : "-"}
            </span>
          ),
        },
        {
          id: "clientId",
          header: "Cliente",
          className: "text-black/70",
          cell: (row) => <span className="truncate">{formatClientLabel(row.client)}</span>,
        },
        {
          id: "warehouseId",
          header: "Almacen",
          className: "text-black/70",
          cell: (row) => <span className="truncate">{row.warehouse?.name ?? "-"}</span>,
        },
        {
          id: "source",
          header: "Enganche",
          className: "text-black/70",
          cell: (row) => <span className="truncate">{row.source?.name ?? "-"}</span>,
        },
        
        {
          id: "deliveryType",
          header: "Tipo",
          className: "text-black/70",
          cell: (row) => deliveryTypeBadge(row.deliveryType),
        },
        {
          id: "total",
          header: "Total",
          className: "text-black/70",
          cell: (row) => <span className="tabular-nums">{formatMoney(row.total ?? 0)}</span>,
        },
        {
          id: "totalPaid",
          header: "Pagado",
          className: "text-black/70",

          cell: (row) => <span className="tabular-nums">{formatMoney(row.totalPaid ?? 0)}</span>,
        },
        {
          id: "pending",
          header: "Pend.",
          className: "text-black/70",
          cell: (row) => <span className="tabular-nums">{formatMoney(row.pendingAmount ?? 0)}</span>,
        },
        {
          id: "agendaStatus",
          header: "E.Agenda",
          className: "text-black/70",
          cell: (row) => agendaStatusBadge(row.agendaStatus),
        },
        {
          id: "deliveryStatus",
          header: "E.Entrega",
          className: "text-black/70",
          cell: (row) => deliveryStatusBadge(row.deliveryStatus),
        },
        {
          id: "actions",
          header: "Acciones",
          headerClassName: "text-center [&>div]:justify-center",
          stopRowClick: true,
          cell: (row) => {
            const isCanceled = row.agendaStatus === AgendaStatus.CANCELED;

            const isProgrammedDelivered =
              row.agendaStatus === AgendaStatus.PROGRAMMED &&
              row.deliveryStatus === DeliveryStatus.DELIVERED;

            const canEditOrCancel = !isCanceled && !isProgrammedDelivered;

            const canConfirmDelivery =
              row.agendaStatus === AgendaStatus.PROGRAMMED &&
              (row.deliveryStatus === DeliveryStatus.IN_PROGRESS ||
                row.deliveryStatus === DeliveryStatus.WAITING);
            
            return (
              <div className="flex justify-center">
                <ActionsPopover
                  actions={[
                    canEditOrCancel && {
                      id: "edit",
                      label: "Editar",
                      icon: <Pencil className="h-4 w-4 text-black/60" />,
                      onClick: () => {
                        setEditOrderId(row.id);
                        setOpen(true);
                      },
                    },
                    {
                      id: "pdf",
                      label: "Abrir pdf",
                      icon: <FileText className="h-4 w-4 text-black/60" />,
                      onClick: () => {
                        setPdfOpen(true);
                        setPdfOrderId(row.id);
                      },
                    },
                    {
                      id: "payments",
                      label: "Pagos",
                      icon: <BanknoteArrowUp className="h-4 w-4 text-black/60" />,
                      onClick: () => {
                        setPaymentsOrderId(row.id);
                        const serie = row.serie ?? "-";
                        const corr = row.correlative ?? "-";
                        setPaymentsOrderLabel(`${serie}-${corr}`);
                        setPaymentsOpen(true);
                      },
                    },
                    canConfirmDelivery && {
                      id: "confirm-delivery",
                      label: "Confirmar entrega",
                      icon: <Truck className="h-4 w-4 text-black/60" />,
                      onClick: () => {
                        setConfirmDeliveryOrderId(row.id);
                        setConfirmDeliveryOpen(true);
                      },
                    },
                    canEditOrCancel && {
                      id: "cancel",
                      label: "Cancelar",
                      className: "text-rose-700 hover:bg-rose-50",
                      icon: <XCircle className="h-4 w-4" />,
                      onClick: () => {
                        setCancelOrderId(row.id);
                        setCancelOpen(true);
                      },
                    },
                  ].filter(Boolean) as ActionItem[]}
                  columns={1}
                  compact
                  showLabels
                  triggerIcon={<Menu className="h-4 w-4" />}
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
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03] disabled:pointer-events-none disabled:opacity-50 ${action.className ?? ""}`}
                      disabled={action.disabled}
                    >
                      {action.icon}
                      <span className="whitespace-nowrap">{action.label}</span>
                    </button>
                  )}
                />
              </div>
            );
          },
          className: "text-left",
          hideable: true,
          sortable: false,
        },
      ];
    }, []);

    return (
      <PageShell>
        <div className="flex items-center justify-end gap-3">
          <SystemButton
            className="bg-green-600/80 hover:bg-green-700/80 text-white"
            onClick={() => setImportOpen(true)}
            leftIcon={<Sheet className="h-4 w-4" />}
            disabled={importLoading}
            loading={importLoading}
            title={companyActionTitle}
          >
            Importar Excel
          </SystemButton>

          <SystemButton onClick={openModal} leftIcon={<Plus className="h-4 w-4" />} disabled={companyActionDisabled} title={companyActionTitle}>
            Nuevo pedido
          </SystemButton>
        </div>

        <div className="mt-1 space-y-3">
          <DataTableSearchChips chips={searchChips} onRemove={(chip) => handleRemoveChip(chip.removeKey)} />

          <DataTable
            tableId="sale-orders-table"
            data={orders}
            columns={columns}
            rowKey="id"
            loading={loading}
            emptyMessage="No hay pedidos con los filtros actuales."
            selectableColumns
            hoverable={false}
            animated={false}
            toolbarSearchContent={
              <DataTableSearchBar
                value={searchText}
                onChange={handleSearchTextChange}
                onSubmitSearch={submitSearch}
                searchLabel="Busca tu pedido"
                searchName="sale-order-smart-search"
                canSaveMetric={hasSaleOrderSearchCriteria(executedSnapshot)}
                saveLoading={savingMetric}
                onSaveMetric={handleSaveMetric}
              >
                <SaleOrderSmartSearchPanel
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
            pagination={{
              page: serverPagination.page,
              limit: serverPagination.limit,
              total: serverPagination.total,
            }}
            onRowClick={(row) => {
              setSelectedOrder(row);
              setDetailOpen(true);
            }}
            onPageChange={handlePageChange}
            tableClassName="text-[10px]"
          />
        </div>

        <SaleOrderModal
          open={open}
          onClose={closeModal}
          orderId={editOrderId}
          onSaved={loadOrders}
        />   
        <PdfViewerModal
          open={pdfOpen}
          title="PDF del pedido"
          iframeTitle="PDF del pedido"
          loadWhen={Boolean(pdfOrderId)}
          getPdf={() => {
            if (!pdfOrderId) {
              return Promise.reject(new Error("Pedido no encontrado."));
            }

            return getSaleOrderPdf(pdfOrderId);
          }}
          onClose={() => {
            setPdfOpen(false);
            setPdfOrderId(null);
          }}
        />   
        <SaleOrderDetailsModal open={detailOpen} order={selectedOrder} onClose={() => setDetailOpen(false)} />

        {paymentsOpen && paymentsOrderId ? (
          <SaleOrderPaymentsOrderModal
            open={paymentsOpen}
            saleOrderId={paymentsOrderId}
            saleOrderLabel={paymentsOrderLabel ?? undefined}
            onClose={() => {
              setPaymentsOpen(false);
              setPaymentsOrderId(null);
              setPaymentsOrderLabel(null);
            }}
            onUpdated={() => {
              void loadOrders();
              if (detailOpen && selectedOrder?.id === paymentsOrderId) {
                void fetchSaleOrderById(paymentsOrderId).then(setSelectedOrder).catch(() => undefined);
              }
            }}
          />
        ) : null}

        <AlertModal
          open={cancelOpen}
          type="deleted"
          title="Cancelar pedido"
          confirmText="Confirmar"
          message="Â¿Seguro que deseas cancelar este pedido?"
          loading={cancelLoading}
          onClose={() => {
            if (cancelLoading) return;
            setCancelOpen(false);
            setCancelOrderId(null);
          }}
          onConfirm={handleCancelSaleOrder}
        />

        <AlertModal
          open={confirmDeliveryOpen}
          type="info"
          title="Confirmar entrega"
          confirmText="Confirmar"
          message="Â¿Seguro que deseas confirmar la entrega de este pedido?"
          loading={confirmDeliveryLoading}
          onClose={() => {
            if (confirmDeliveryLoading) return;
            setConfirmDeliveryOpen(false);
            setConfirmDeliveryOrderId(null);
          }}
          onConfirm={handleConfirmDelivery}
        />
        <ExcelImportModal<SaleOrderJsonImportRow>
          open={importOpen}
          title="Importar pedidos"
          fields={saleOrderImportFields}
          onClose={() => setImportOpen(false)}
          onSubmit={handleImportPreview}
        />
      </PageShell>
    );
  }

