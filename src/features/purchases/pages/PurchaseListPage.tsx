import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type SetStateAction } from "react";
import { DataTable } from "@/shared/components/table/DataTable";
import {
    DataTableSearchBar,
    DataTableSearchChips,
    type DataTableRecentSearchItem,
    type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import type { DataTableColumn } from "@/shared/components/table/types";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import {
    approveCreationWithPayment,
    approveProcessingPurchaseOrder,
    confirmPurchaseReception,
    deletePurchaseSearchMetric,
    enterPurchaseOrder,
    exportPurchaseOrdersExcel,
    getPurchaseExportColumns,
    getPurchaseExportPresets,
    getPurchaseSearchState,
    listPurchaseOrders,
    rejectProcessingPurchaseOrder,
    rejectCreationWithPayment,
    requestProcessingPurchaseOrder,
    savePurchaseSearchMetric,
    savePurchaseExportPreset,
    setCancelPurchase,
    setSentPurchase,
    deletePurchaseExportPreset,
    listPayments as listPurchasePayments,
    updatePurchaseOrder,
} from "@/shared/services/purchaseService";
import { uploadPurchaseAttachment } from "@/shared/services/purchaseAttachmentService";
import { useNavigate, useSearchParams } from "react-router-dom";
import { money, parseDateInputValue, toLocalDateKey } from "@/shared/utils/functionPurchases";
import { PaymentListModal } from "@/features/purchases/components/PaymentListModal";
import { QuotaListModal } from "@/features/purchases/components/QuotaListModal";
import { PurchasePaymentModal } from "@/features/purchases/components/PurchasePaymentModal";
import { PurchaseModal } from "@/features/purchases/components/PurchaseModal";
import { PurchaseDetailsModal } from "@/features/purchases/components/PurchaseDetailsModal";
import type {
    PurchaseExportColumn,
    PurchaseOrder,
    PurchaseSearchFilters,
    PurchaseSearchRule,
    PurchaseSearchSnapshot,
    PurchaseSearchStateResponse,
} from "@/features/purchases/types/purchase";
import { PurchaseOrderStatus, PurchaseOrderStatuses, VoucherDocType, VoucherDocTypes, PaymentFormTypes } from "@/features/purchases/types/purchaseEnums";
import TimerToEnd, { formatDate } from "@/shared/components/components/TimerToEnd";
import { ActionsPopover, type ActionItem } from "@/shared/components/components/ActionsPopover";
import { AlertCircle, Calendar, CreditCard, FileText, List, Menu, OctagonAlert, PackageCheck, Pencil, Play, Plus, Timer, XCircle } from "lucide-react";
import { getPurchaseOrderPdf } from "@/shared/services/pdfServices";
import { PdfViewerModal } from "@/shared/components/components/ModalOpenPdf";
import { PageShell } from "@/shared/layouts/PageShell";
import { SystemButton } from "@/shared/components/components/SystemButton";
import {
    buildPurchaseSearchChips,
    buildPurchaseSmartSearchColumns,
    createEmptyPurchaseSearchFilters,
    hasPurchaseSearchCriteria,
    upsertPurchaseSearchRule,
    removePurchaseSearchKey,
    sanitizePurchaseSearchSnapshot,
    type PurchaseSearchFilterKey,
} from "@/features/purchases/utils/purchaseSmartSearch";
import { PurchaseSmartSearchPanel } from "@/features/purchases/components/PurchaseSmartSearchPanel";
import { useCompany } from "@/shared/hooks/useCompany";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { ExtraTimeModal } from "@/features/purchases/components/ExtraTimeModal";
import { PurchaseCompletionPhotoModal } from "@/features/purchases/components/PurchaseCompletionPhotoModal";
import { addPurchaseExtraTime, uploadPurchaseImageProdution } from "@/features/purchases/utils/purchaseActions";
import { ExportPopover } from "@/shared/components/components/ExportPopover";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { PageTitle } from "@/shared/components/components/PageTitle";
import { approvePayment as approvePaymentById } from "@/shared/services/paymentService";
import { RoutesPaths } from "@/routes/config/routesPaths";
import { NOTIFICATION_WINDOW_EVENTS } from "@/features/mail/constants/mail-events.constants";
import { sileo } from "sileo";
import { purchaseTypeLabels } from "@/features/purchases/types/purchase-classification.types";
import { PurchaseTypesInfoModal } from "@/features/purchases/components/PurchaseTypesInfoModal";
import { PurchaseFiscalDocumentsModal } from "@/features/purchases/components/documents/PurchaseFiscalDocumentsModal";
import { uploadPaymentEvidenceFiles } from "@/features/purchases/utils/purchasePaymentEvidence";

const PRIMARY = "hsl(var(--primary))";
const PHOTO_MODAL_SKIP_KEY = "purchase-photo-modal-skipped";

const statusLabels: Record<PurchaseOrderStatus, string> = {
    [PurchaseOrderStatuses.DRAFT]: "Borrador",
    [PurchaseOrderStatuses.SENT]: "Enviado",
    [PurchaseOrderStatuses.PARTIAL]: "Parcial",
    [PurchaseOrderStatuses.PENDING_RECEIPT_CONFIRMATION]: "Pendiente confirmacion",
    [PurchaseOrderStatuses.RECEIVED]: "Recibido",
    [PurchaseOrderStatuses.CANCELLED]: "Cancelado",
};

const docTypeLabels: Record<VoucherDocType, string> = {
    [VoucherDocTypes.FACTURA]: "Factura",
    [VoucherDocTypes.BOLETA]: "Boleta",
    [VoucherDocTypes.NOTA_VENTA]: "Nota de venta",
};

const paymentFormLabels: Record<string, string> = {
    [PaymentFormTypes.CONTADO]: "Contado",
    [PaymentFormTypes.CREDITO]: "Credito",
};

const hasPaymentForm = (purchase: PurchaseOrder) =>
    purchase.paymentForm === PaymentFormTypes.CONTADO ||
    purchase.paymentForm === PaymentFormTypes.CREDITO;

type PurchaseRow = {
    id: string;
    purchase: PurchaseOrder;
    numero: string;
    supplierLabel: string;
    supplierDoc: string;
    warehouseLabel: string;
    purchaseTypeLabel: string;
    statusLabel: string;
    docLabel: string;
    date: string;
    time?: string;
    dateEnter: string;
    timeEnter?: string;
};

export default function Purchases() {
    const showFeedback = useCallback((payload: { type?: string; message?: string }) => {
        const kind = payload?.type ?? "success";
        const title = payload?.message ?? "Operación completada";
        if (kind === "success") sileo.success({ title });
        else if (kind === "warning") sileo.warning({ title });
        else if (kind === "info") sileo.info({ title });
        else sileo.error({ title });
    }, []);
    const clearFeedback = useCallback(() => undefined, []);
    const showFeedbackRef = useRef(showFeedback);
    useEffect(() => { showFeedbackRef.current = showFeedback; }, [showFeedback]);
    const { hasCompany } = useCompany();
    const { can, canAny } = usePermissions();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const canCreatePurchase = can("purchases.create");
    const canApproveProcessing = can("purchases.approve");
    const canReceivePurchase = can("purchases.receive");
    const canApproveCreationWithPayment = canAny([
        "payments.approve",
        "purchases.approve",
    ]);
    const canDeleteProcessedPurchase = can("purchases.delete_processed_purchase");
    const companyActionDisabled = !hasCompany;
    const companyActionTitle = hasCompany ? undefined : "Primero registra la empresa.";

    const [searchText, setSearchText] = useState("");
    const [appliedSearchText, setAppliedSearchText] = useState("");
    const [searchFilters, setSearchFilters] = useState<PurchaseSearchFilters>(() => createEmptyPurchaseSearchFilters());
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [page, setPage] = useState(1);
    const limit = 25;

    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
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
    const [searchState, setSearchState] = useState<PurchaseSearchStateResponse | null>(null);
    const [exportColumns, setExportColumns] = useState<PurchaseExportColumn[]>([]);
    const [exportPresets, setExportPresets] = useState<Array<{ metricId: string; name: string; columns: PurchaseExportColumn[] }>>([]);
    const [exporting, setExporting] = useState(false);
    const [openPurchaseTypesInfo, setOpenPurchaseTypesInfo] = useState(false);
    const [useTableDateRangeForExport, setUseTableDateRangeForExport] = useState(true);
    const [savingMetric, setSavingMetric] = useState(false);
    const [modalPaymentList, setModalPaymentList] = useState(false);
    const [modalQuotaList, setModalQuotaList] = useState(false);
    const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
    const [editPoId, setEditPoId] = useState<string | undefined>(undefined);

    const [totalPo, setTotalPo] = useState(0);
    const [poId, setPoId] = useState("");
    const [paymentForm, setPaymentForm] = useState("");
    const [paymentSetupForm, setPaymentSetupForm] = useState<PurchaseOrder | null>(null);
    const [paymentSetupSaving, setPaymentSetupSaving] = useState(false);
    const [openPdfModal, setOpenPdfModal] = useState(false);
    const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);
    const [selectedPurchaseRow, setSelectedPurchaseRow] = useState<PurchaseRow | null>(null);
    const [extraTimePoId, setExtraTimePoId] = useState<string | null>(null);
    const [extraTimeLoading, setExtraTimeLoading] = useState(false);
    const [completedPhotoPo, setCompletedPhotoPo] = useState<PurchaseOrder | null>(null);
    const [completedPhotoLoading, setCompletedPhotoLoading] = useState(false);
    const [fiscalDocumentsPoId, setFiscalDocumentsPoId] = useState<string | null>(null);
    const skippedPhotoRef = useRef<Set<string>>(new Set());
    const handledDeepLinkRef = useRef<string | null>(null);
    const isPhotoPromptSkipped = useCallback((poId?: string) => {
        if (!poId) return false;
        try {
            const raw = localStorage.getItem(PHOTO_MODAL_SKIP_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw) as Record<string, boolean>;
            return Boolean(parsed[poId]);
        } catch {
            return false;
        }
    }, []);

    const markPhotoPromptSkipped = useCallback((poId?: string) => {
        if (!poId) return;
        try {
            const raw = localStorage.getItem(PHOTO_MODAL_SKIP_KEY);
            const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
            parsed[poId] = true;
            localStorage.setItem(PHOTO_MODAL_SKIP_KEY, JSON.stringify(parsed));
        } catch {
            // no-op
        }
    }, []);

    const draftSnapshot = useMemo(
        () =>
            sanitizePurchaseSearchSnapshot({
                q: searchText,
                filters: searchFilters,
            }),
        [searchFilters, searchText],
    );

    const executedSnapshot = useMemo(
        () =>
            sanitizePurchaseSearchSnapshot({
                q: appliedSearchText,
                filters: searchFilters,
            }),
        [appliedSearchText, searchFilters],
    );

    const loadSearchState = useCallback(async () => {
        try {
            const response = await getPurchaseSearchState();
            setSearchState(response);
        } catch {
            showFeedbackRef.current({ type: "error", message: "Error al cargar el estado del buscador inteligente" });
        }
    }, []);

    const loadExportColumns = useCallback(async () => {
        try {
            const response = await getPurchaseExportColumns();
            setExportColumns(response ?? []);
        } catch {
            showFeedbackRef.current({ type: "error", message: "Error al cargar columnas de exportacion" });
        }
    }, []);

    const loadExportPresets = useCallback(async () => {
        try {
            const response = await getPurchaseExportPresets();
            setExportPresets(
                (response ?? []).map((item) => ({
                    metricId: item.metricId,
                    name: item.name,
                    columns: (item.snapshot?.columns ?? []) as PurchaseExportColumn[],
                })),
            );
        } catch {
            showFeedbackRef.current({ type: "error", message: "Error al cargar presets de exportacion" });
        }
    }, []);

    const submitSearch = useCallback(() => {
        startTransition(() => {
            setAppliedSearchText(searchText.trim());
            setPage(1);
        });
    }, [searchText]);

    const handleSearchTextChange = useCallback((value: string) => {
        startTransition(() => {
            setSearchText(value);
        });
    }, []);

    const loadPurchases = useCallback(async () => {
        clearFeedback();
        setLoading(true);
        setError(null);
        try {
            const res = await listPurchaseOrders({
                page,
                limit,
                q: executedSnapshot.q,
                filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
                from: fromDate || undefined,
                to: toDate || undefined,
            });
            setPurchases(res.items ?? []);
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
            if (hasPurchaseSearchCriteria(executedSnapshot)) {
                void loadSearchState();
            }
        } catch {
            setPurchases([]);
            setPagination((prev) => ({
                ...prev,
                total: 0,
                totalPages: 1,
                hasPrev: false,
                hasNext: false,
            }));
            setError("Error al listar compras");
            showFeedbackRef.current({ type: "error", message: "Error al listar compras" });
        } finally {
            setLoading(false);
        }
    }, [
        clearFeedback,
        executedSnapshot,
        fromDate,
        limit,
        loadSearchState,
        page,
        toDate,
    ]);

    const setSent = useCallback(async (id: string) => {
        clearFeedback();
        try {
            const res = await setSentPurchase(id);
            if (res.type === "error") {
                showFeedback({ type: "error", message: res.message });
            }
            if (res.type === "success") {
                showFeedback({ type: "success", message: res.message });
                void loadPurchases();
            }
        } catch {
            showFeedback({ type: "error", message: "Error al iniciar espera de mercaderia" });
        }
    }, [clearFeedback, loadPurchases, showFeedback]);

    const cancelOrder = useCallback(async (id: string) => {
        clearFeedback();
        try {
            const res = await setCancelPurchase(id);
            if (res.type === "error") {
                showFeedback({ type: "error", message: res.message });
            }
            if (res.type === "success") {
                showFeedback({ type: "success", message: res.message });
                void loadPurchases();
            }
        } catch {
            showFeedback({ type: "error", message: "Error al iniciar espera de mercaderia" });
        }
    }, [clearFeedback, loadPurchases, showFeedback]);

    const openPurchasePdf = useCallback((id: string) => {
        clearFeedback();
        setSelectedProductionId(id);
        setOpenPdfModal(true);
    }, [clearFeedback]);

    const openPaymentFlow = useCallback((purchase: PurchaseOrder) => {
        const nextPoId = purchase.poId ?? "";
        if (!nextPoId) return;

        setPoId(nextPoId);
        setTotalPo(purchase.total);
        setPaymentForm(purchase.paymentForm ?? "");

        if (!hasPaymentForm(purchase)) {
            setPaymentSetupForm({
                ...purchase,
                paymentForm: "" as PurchaseOrder["paymentForm"],
                payments: purchase.payments ?? [],
                quotas: purchase.quotas ?? [],
            });
            return;
        }

        if (purchase.paymentForm === PaymentFormTypes.CREDITO) {
            setModalQuotaList(true);
            return;
        }

        setModalPaymentList(true);
    }, []);

    const savePaymentSetup = useCallback(async () => {
        if (!paymentSetupForm?.poId) return;
        if (!hasPaymentForm(paymentSetupForm)) {
            showFeedback({ type: "error", message: "Selecciona si la compra sera al contado o a credito." });
            return;
        }

        clearFeedback();
        setPaymentSetupSaving(true);
        try {
            const isCredit = paymentSetupForm.paymentForm === PaymentFormTypes.CREDITO;
            const payments = (paymentSetupForm.payments ?? [])
                .filter((payment) => (payment.amount ?? 0) > 0)
                .map((payment) => ({
                    method: payment.method,
                    date: payment.date,
                    currency: payment.currency,
                    amount: payment.amount ?? 0,
                    operationNumber: payment.operationNumber ?? undefined,
                    note: payment.note ?? undefined,
                    quotaId: payment.quotaId ?? undefined,
                    poId: payment.poId ?? undefined,
                    accountPayableId: payment.accountPayableId ?? undefined,
                    companyPaymentAccountId: payment.companyPaymentAccountId ?? undefined,
                    paymentMethodId: payment.paymentMethodId ?? undefined,
                    bankName: payment.bankName ?? undefined,
                    cardLastFour: payment.cardLastFour ?? undefined,
                    operationCode: payment.operationCode ?? undefined,
                    isPartial: payment.isPartial ?? undefined,
                }));
            const quotas = (paymentSetupForm.quotas ?? []).map((quota) => ({
                number: quota.number,
                expirationDate: quota.expirationDate,
                paymentDate: quota.paymentDate ?? undefined,
                totalToPay: quota.totalToPay,
                totalPaid: quota.totalPaid ?? undefined,
                poId: quota.poId ?? undefined,
            }));
            const res = await updatePurchaseOrder(paymentSetupForm.poId, {
                paymentForm: paymentSetupForm.paymentForm,
                creditDays: paymentSetupForm.creditDays ?? 0,
                numQuotas: paymentSetupForm.numQuotas ?? 0,
                payments: isCredit ? [] : payments,
                quotas: isCredit ? quotas : [],
            });

            showFeedback({ type: res.type === "success" ? "success" : "error", message: res.message });
            if (res.type !== "success") return;

            const paymentsWithEvidence = (paymentSetupForm.payments ?? []).filter((payment) => payment.paymentEvidenceFile);
            if (!isCredit && paymentsWithEvidence.length > 0) {
                try {
                    const persistedPayments = res.order?.payments?.length
                        ? res.order.payments
                        : await listPurchasePayments(paymentSetupForm.poId);
                    await uploadPaymentEvidenceFiles({
                        purchaseId: paymentSetupForm.poId,
                        draftPayments: paymentSetupForm.payments ?? [],
                        persistedPayments,
                        upload: uploadPurchaseAttachment,
                    });
                } catch {
                    showFeedback({
                        type: "error",
                        message: "Pago registrado, pero no se pudo subir el comprobante. Puedes subirlo desde documentos de la compra.",
                    });
                }
            }

            setPoId(paymentSetupForm.poId);
            setTotalPo(paymentSetupForm.total);
            setPaymentForm(paymentSetupForm.paymentForm ?? "");
            setPaymentSetupForm(null);
            await loadPurchases();

            if (isCredit) {
                setModalQuotaList(true);
                return;
            }
            setModalPaymentList(true);
        } catch (err) {
            showFeedback({ type: "error", message: parseApiError(err) });
        } finally {
            setPaymentSetupSaving(false);
        }
    }, [clearFeedback, loadPurchases, paymentSetupForm, showFeedback]);

    const paymentSetupSaveDisabled = useMemo(() => {
        if (!paymentSetupForm || paymentSetupSaving || !hasPaymentForm(paymentSetupForm)) return true;
        if (paymentSetupForm.paymentForm === PaymentFormTypes.CREDITO) {
            return !(paymentSetupForm.quotas ?? []).length;
        }
        return !(paymentSetupForm.payments ?? []).some((payment) => (payment.amount ?? 0) > 0);
    }, [paymentSetupForm, paymentSetupSaving]);

    const setPaymentSetupDraft = useCallback((next: SetStateAction<PurchaseOrder>) => {
        setPaymentSetupForm((prev) => {
            if (!prev) return prev;
            return typeof next === "function" ? next(prev) : next;
        });
    }, []);

    const EnterToWarehouse = useCallback(async (id: string) => {
        clearFeedback();
        try {
            const res = await enterPurchaseOrder(id);
            if (res.type === "error") {
                showFeedback({ type: "error", message: res.message });
                void loadPurchases();
            }
            if (res.type === "success") {
                showFeedback({ type: "success", message: res.message });
                const selected = purchases.find((purchase) => purchase.poId === id) ?? null;
                setCompletedPhotoPo(selected);
                void loadPurchases();
            }
        } catch {
            showFeedback({ type: "error", message: "Error al ingresar a almacen" });
            void loadPurchases();
        }
    }, [clearFeedback, loadPurchases, purchases, showFeedback]);

    const requestProcessing = useCallback(async (id: string) => {
        clearFeedback();
        try {
            const res = await requestProcessingPurchaseOrder(id);
            if (res.type === "success") {
                showFeedback({ type: "success", message: res.message });
                await loadPurchases();
                return;
            }
            showFeedback({ type: "error", message: res.message });
        } catch {
            showFeedback({ type: "error", message: "No se pudo solicitar aprobación de procesamiento" });
        }
    }, [clearFeedback, loadPurchases, showFeedback]);

    const approveProcessing = useCallback(async (id: string) => {
        clearFeedback();
        try {
            const res = await approveProcessingPurchaseOrder(id);
            if (res.type === "success") {
                showFeedback({ type: "success", message: res.message });
                await loadPurchases();
                return;
            }
            showFeedback({ type: "error", message: res.message });
        } catch {
            showFeedback({ type: "error", message: "No se pudo aprobar el procesamiento" });
        }
    }, [clearFeedback, loadPurchases, showFeedback]);

    const rejectProcessing = useCallback(async (id: string) => {
        clearFeedback();
        try {
            const res = await rejectProcessingPurchaseOrder(id);
            if (res.type === "success") {
                showFeedback({ type: "success", message: res.message });
                await loadPurchases();
                return;
            }
            showFeedback({ type: "error", message: res.message });
        } catch {
            showFeedback({ type: "error", message: "No se pudo rechazar el procesamiento" });
        }
    }, [clearFeedback, loadPurchases, showFeedback]);

    const confirmReception = useCallback(async (id: string) => {
        clearFeedback();
        try {
            const res = await confirmPurchaseReception(id);
            if (res.type === "success") {
                showFeedback({ type: "success", message: res.message });
                await loadPurchases();
                return true;
            }

            showFeedback({ type: "error", message: res.message });
            return false;
        } catch {
            showFeedback({ type: "error", message: "Error al confirmar ingreso a stock" });
            return false;
        }
    }, [clearFeedback, loadPurchases, showFeedback]);

    const addExtraTime = useCallback(async (values: { days: number; hours: number; minutes: number }) => {
        if (!extraTimePoId) return;
        setExtraTimeLoading(true);
        try {
            const res = await addPurchaseExtraTime(extraTimePoId, values);
            if (res.type === "success") {
                showFeedback({ type: "success", message: res.message });
                setExtraTimePoId(null);
                await loadPurchases();
            } else {
                showFeedback({ type: "error", message: res.message });
            }
        } catch {
            showFeedback({ type: "error", message: "Error al agregar tiempo extra" });
        } finally {
            setExtraTimeLoading(false);
        }
    }, [extraTimePoId, loadPurchases, showFeedback]);

    const uploadCompletedPhoto = useCallback(async (file: File) => {
        const poId = completedPhotoPo?.poId;
        if (!poId) return;
        setCompletedPhotoLoading(true);
        try {
            const res = await uploadPurchaseImageProdution(poId, file);
            if (res.type === "success") {
                skippedPhotoRef.current.add(poId);
                const confirmed = await confirmReception(poId);
                if (confirmed) {
                    showFeedback({ type: "success", message: `${res.message}. Compra ingresada a stock.` });
                    setCompletedPhotoPo(null);
                }
            } else {
                showFeedback({ type: "error", message: res.message });
            }
        } catch (err) {
            showFeedback({ type: "error", message: parseApiError(err, "No se pudo subir la foto de la compra") });
        } finally {
            setCompletedPhotoLoading(false);
        }
    }, [completedPhotoPo?.poId, confirmReception, showFeedback]);

    const skipCompletedPhoto = useCallback(async () => {
        const poId = completedPhotoPo?.poId;
        if (!poId) return;
        if (poId) {
            skippedPhotoRef.current.add(poId);
            markPhotoPromptSkipped(poId);
        }
        const confirmed = await confirmReception(poId);
        if (confirmed) {
            setCompletedPhotoPo(null);
            showFeedback({ type: "success", message: "Compra ingresada sin foto. Se puede subir luego desde detalle (admin)." });
        }
    }, [completedPhotoPo?.poId, confirmReception, markPhotoPromptSkipped, showFeedback]);

    useEffect(() => {
        void loadPurchases();
    }, [loadPurchases]);

    useEffect(() => {
        void loadSearchState();
    }, [loadSearchState]);

    useEffect(() => {
        const onRefresh = () => {
            void loadPurchases();
        };
        window.addEventListener(NOTIFICATION_WINDOW_EVENTS.systemNotificationCreated, onRefresh);
        return () => window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.systemNotificationCreated, onRefresh);
    }, [loadPurchases]);

    useEffect(() => {
        void loadExportColumns();
    }, [loadExportColumns]);
    useEffect(() => {
        void loadExportPresets();
    }, [loadExportPresets]);

    useEffect(() => {
        if (completedPhotoPo) return;
        const candidate = purchases.find((purchase) =>
            purchase.status === PurchaseOrderStatuses.PENDING_RECEIPT_CONFIRMATION &&
            (!purchase.imageProdution || purchase.imageProdution.length === 0) &&
            purchase.poId &&
            !skippedPhotoRef.current.has(purchase.poId) &&
            !isPhotoPromptSkipped(purchase.poId),
        );
        if (candidate) setCompletedPhotoPo(candidate);
    }, [completedPhotoPo, isPhotoPromptSkipped, purchases]);

    const now = useMemo(() => new Date().toISOString(), []);

    const purchaseRows = useMemo<PurchaseRow[]>(
        () =>
            purchases.map((purchase) => {
                const numero = [purchase.serie, purchase.correlative].filter((v) => v !== null && v !== undefined && String(v).length > 0).join("-");
                const statusLabel = purchase.status ? (statusLabels[purchase.status] ?? purchase.status) : "-";
                const approvalStatusLabel = "";
                const processingStatusLabel =
                    purchase.processingApprovalStatus === "PENDING" ? " (Pre-envío)"
                    : "";
                const docLabel = purchase.documentType ? (docTypeLabels[purchase.documentType] ?? purchase.documentType) : "-";
                const date = formatDate(new Date(purchase.dateIssue ?? ""));
                const time = purchase.dateIssue
                    ? new Date(purchase.dateIssue).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                    : undefined;
                const dateEnter = formatDate(new Date(purchase.expectedAt ?? ""));
                const timeEnter = purchase.expectedAt
                    ? new Date(purchase.expectedAt).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                    : undefined;

                return {
                    id: purchase.poId ?? `${purchase.supplierId}-${purchase.createdAt ?? numero}`,
                    purchase,
                    numero,
                    supplierLabel: purchase.supplierName ?? "-",
                    supplierDoc: purchase.supplierDocumentNumber ?? "",
                    warehouseLabel: purchase.warehouseName ?? "-",
                    purchaseTypeLabel: purchase.purchaseType ? (purchaseTypeLabels[purchase.purchaseType] ?? purchase.purchaseType) : "Stock comercial",
                    statusLabel: `${statusLabel}${approvalStatusLabel}${processingStatusLabel}`,
                    docLabel,
                    date,
                    time,
                    dateEnter,
                    timeEnter,
                };
            }),
        [purchases],
    );

    useEffect(() => {
        const purchaseId = searchParams.get("purchaseId");
        const modal = searchParams.get("modal");
        const action = searchParams.get("action");
        const paymentId = searchParams.get("paymentId");
        if (!purchaseId) return;
        const key = `${purchaseId}|${modal ?? ""}|${action ?? ""}`;
        if (handledDeepLinkRef.current === key) return;

        const target = purchaseRows.find((row) => row.purchase.poId === purchaseId);
        if (!target) return;

        handledDeepLinkRef.current = key;

        const run = async () => {
            if (action === "approveCreationWithPayment") {
                const res = await approveCreationWithPayment(purchaseId);
                showFeedback({ type: res.type === "success" ? "success" : "error", message: res.message });
                await loadPurchases();
            } else if (action === "rejectCreationWithPayment") {
                const res = await rejectCreationWithPayment(purchaseId);
                showFeedback({ type: res.type === "success" ? "success" : "error", message: res.message });
                await loadPurchases();
            } else if (action === "approveProcessing") {
                await approveProcessing(purchaseId);
            } else if (action === "rejectProcessing") {
                await rejectProcessing(purchaseId);
            } else if (action === "approvePayment" && paymentId) {
                const res = await approvePaymentById(paymentId);
                showFeedback({ type: res.type === "success" ? "success" : "error", message: res.message });
                await loadPurchases();
            }

            if (modal === "payments") {
                setPoId(purchaseId);
                setTotalPo(target.purchase.total);
                setPaymentForm(target.purchase.paymentForm ?? "");
                setModalPaymentList(true);
            } else {
                setSelectedPurchaseRow(target);
            }
            setSearchParams({}, { replace: true });
        };
        void run();
    }, [
        approveProcessing,
        loadPurchases,
        purchaseRows,
        rejectProcessing,
        searchParams,
        setSearchParams,
        showFeedback,
    ]);

    const columns = useMemo<DataTableColumn<PurchaseRow>[]>(() => [
        {
            id: "dateIssue",
            header: "Emisión",
            cell: (row) => (
                <div className="text-black/70">
                    {row.date} {row.time}
                </div>
            ),
            headerClassName: "text-left",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "docLabel",
            header: "Documento",
            accessorKey: "docLabel",
            headerClassName: "text-left",
            className: "text-black/70",
            hideable: true,
            sortable: false,
            visible: false,
        },
        {
            id: "numero",
            header: "Numero",
            accessorKey: "numero",
            headerClassName: "text-left",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "supplier",
            header: "Proveedor",
            cell: (row) => (
                <div className="text-black/70">
                    <div>{row.supplierLabel}</div>
                </div>
            ),
            headerClassName: "text-left",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "purchaseType",
            header: "Tipo",
            accessorKey: "purchaseTypeLabel",
            headerClassName: "text-left",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "warehouse",
            header: "Almacen",
            accessorKey: "warehouseLabel",
            headerClassName: "text-left",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "paymentForm",
            header: "Forma",
            cell: (row) => <span className="text-black/70">{paymentFormLabels[row.purchase.paymentForm ?? ""] ?? row.purchase.paymentForm}</span>,
            headerClassName: "text-left",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "total",
            header: "Total",
            cell: (row) => <span className="text-black/70 tabular-nums">{money(row.purchase.total ?? 0, row.purchase.currency)}</span>,
            headerClassName: "text-left",
            className: "text-left",
            hideable: true,
            sortable: false,
        },
        {
            id: "totalPaid",
            header: "Pag.",
            cell: (row) => <span className="text-black/70 tabular-nums">{money(row.purchase.totalPaid ?? 0, row.purchase.currency)}</span>,
            headerClassName: "text-left",
            className: "text-left",
            hideable: true,
            sortable: false,
            visible: false,
        },
        {
            id: "totalToPay",
            header: "Pend.",
            cell: (row) => <span className="text-black/70 tabular-nums">{money(row.purchase.totalToPay ?? 0, row.purchase.currency)}</span>,
            headerClassName: "text-left",
            className: "text-left",
            hideable: true,
            sortable: false,
        },
        {
            id: "status",
            header: "Estado",
            cell: (row) => (
                <span className="inline-flex rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                    {row.statusLabel}
                </span>
            ),
            headerClassName: "text-left",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "expectedAt",
            header: "Ing. Almacen",
            cell: (row) => (
                <div className="text-black/70">
                    {row.dateEnter} {row.timeEnter}
                </div>
            ),
            headerClassName: "text-left",
            className: "text-black/70",
            hideable: true,
            sortable: false,
        },
        {
            id: "waitTime",
            header: "T. Espera",
            cell: (row) => (
                <div className="flex h-full items-center justify-center">
                    {row.purchase.status === PurchaseOrderStatuses.DRAFT && row.purchase.approvalStatus === "PENDING" && (
                        <span className="flex items-center rounded-lg gap-2 p-1 text-[10px] font-medium bg-amber-50 text-amber-700">
                            <Timer className="h-4 w-4" />
                            <span className="mt-1">E. confirmación</span>
                        </span>
                    )}
                    {row.purchase.status === PurchaseOrderStatuses.DRAFT && row.purchase.processingApprovalStatus === "PENDING" && (
                        <span className="flex items-center rounded-lg gap-2 p-1 text-[10px] font-medium bg-cyan-50 text-cyan-700">
                            <Timer className="h-4 w-4" />
                            <span className="mt-1">E. aprobación</span>
                        </span>
                    )}
                    {row.purchase.status === PurchaseOrderStatuses.SENT && (
                        <span className="inline-flex rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                            <TimerToEnd from={now} to={row.purchase.expectedAt ?? ""} loadPurchases={loadPurchases} />
                        </span>
                    )}
                    {row.purchase.status === PurchaseOrderStatuses.PARTIAL && (
                        <span className="flex flex-col items-center rounded-lg px-2 py-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                            <OctagonAlert className="h-4 w-4" />
                            <span className="mt-1">Por Ing.</span>
                        </span>
                    )}
                    {row.purchase.status === PurchaseOrderStatuses.RECEIVED && (
                        <span className="flex items-center rounded-lg gap-2 p-1 text-[10px] font-medium bg-slate-50 text-slate-700">
                            <Timer className="h-4 w-4" />
                            <span className="mt-1">Completado</span>
                        </span>
                    )}
                    {row.purchase.status === PurchaseOrderStatuses.PENDING_RECEIPT_CONFIRMATION && (
                        <span className="flex items-center rounded-lg gap-2 p-1 text-[10px] font-medium bg-cyan-50 text-cyan-700">
                            <Timer className="h-4 w-4" />
                            <span className="mt-1">Por confirmar</span>
                        </span>
                    )}
                </div>
            ),
            headerClassName: "text-center [&>div]:justify-center",
            className: "text-center",
            hideable: true,
            sortable: false,
        },

        {
            id: "actions",
            header: "acciones",
            headerClassName: "text-center [&>div]:justify-center",
            stopRowClick: true,
            cell: (row) => {
                const approvalStatus = (row.purchase.approvalStatus ?? "") as string;
                const isApprovalBlocked = approvalStatus === "PENDING" || approvalStatus === "REJECTED";
                const isApprovalRejected = approvalStatus === "REJECTED";
                return (
                <div className="flex justify-center">
                    {isApprovalRejected ? (
                        <ActionsPopover
                            actions={[
                                {
                                    id: "view-detail",
                                    label: "Ver detalle",
                                    icon: <FileText className="h-4 w-4 text-black/60" />,
                                    onClick: () => setSelectedPurchaseRow(row),
                                },
                                can("purchases.view_history") && {
                                    id: "view-history",
                                    label: "Ver historial",
                                    icon: <List className="h-4 w-4 text-black/60" />,
                                    onClick: () => navigate(`${RoutesPaths.purchasesHistory}?purchaseId=${row.purchase.poId ?? ""}`),
                                },
                            ].filter(Boolean) as ActionItem[]}
                            columns={1}
                            compact
                            showLabels
                            triggerIcon={<Menu className="h-4 w-4" />}
                            popoverClassName="min-w-35"
                            popoverBodyClassName="p-2"
                        />
                    ) : (
                    <ActionsPopover
                        actions={[
                            (row.purchase.status === PurchaseOrderStatuses.SENT || row.purchase.status === PurchaseOrderStatuses.PARTIAL) && {
                                id: "enter-warehouse",
                                label: "Procesar llegada",
                                icon: <PackageCheck className="h-4 w-4 text-black/60" />,
                                onClick: () => EnterToWarehouse(row.purchase.poId ?? ""),
                                disabled: companyActionDisabled,
                            },
                            row.purchase.status !== PurchaseOrderStatuses.CANCELLED &&
                            row.purchase.status !== PurchaseOrderStatuses.RECEIVED && {
                                id: "advanced-reception",
                                label: "Recepción avanzada",
                                icon: <PackageCheck className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    const nextPoId = row.purchase.poId ?? "";
                                    if (!nextPoId) return;
                                    navigate(RoutesPaths.purchaseReception.replace(":poId", nextPoId));
                                },
                                disabled: companyActionDisabled || !canReceivePurchase,
                            },
                            row.purchase.status === PurchaseOrderStatuses.PENDING_RECEIPT_CONFIRMATION && {
                                id: "confirm-reception",
                                label: "Confirmar ingreso",
                                icon: <PackageCheck className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    setCompletedPhotoPo(row.purchase);
                                },
                                disabled: companyActionDisabled,
                            },
                            row.purchase.status === PurchaseOrderStatuses.SENT && {
                                id: "extra-time",
                                label: "Tiempo extra",
                                icon: <Timer className="h-4 w-4 text-black/60" />,
                                onClick: () => setExtraTimePoId(row.purchase.poId ?? ""),
                                disabled: companyActionDisabled,
                            },
                            row.purchase.status === PurchaseOrderStatuses.DRAFT && {
                                id: "process",
                                label: row.purchase.processingApprovalStatus === "PENDING" ? "A. procesar" : "Procesar",
                                icon: <Play className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    const poId = row.purchase.poId ?? "";
                                    if (!poId) return;
                                    if (row.purchase.processingApprovalStatus === "PENDING" && canApproveProcessing) {
                                        void approveProcessing(poId);
                                        return;
                                    }
                                    if (canApproveProcessing) {
                                        void setSent(poId);
                                        return;
                                    }
                                    void requestProcessing(poId);
                                },
                                disabled:
                                    companyActionDisabled ||
                                    isApprovalBlocked,
                                hidden:
                                    isApprovalBlocked ||
                                    (row.purchase.processingApprovalStatus === "PENDING" && !canApproveProcessing),
                            },
                            row.purchase.status === PurchaseOrderStatuses.DRAFT &&
                            row.purchase.approvalStatus === "PENDING" &&
                            canApproveCreationWithPayment && {
                                id: "approve-creation-with-payment",
                                label: "Aprobar compra con pago",
                                icon: <PackageCheck className="h-4 w-4 text-black/60" />,
                                onClick: async () => {
                                    const poId = row.purchase.poId ?? "";
                                    if (!poId) return;
                                    const res = await approveCreationWithPayment(poId);
                                    showFeedback({ type: res.type === "success" ? "success" : "error", message: res.message });
                                    await loadPurchases();
                                },
                                disabled: companyActionDisabled,
                            },
                            row.purchase.paymentForm !== PaymentFormTypes.CREDITO &&
                            row.purchase.totalPaid != row.purchase.total && {
                                id: "payment",
                                label: "Pagos",
                                icon: <CreditCard className="h-4 w-4 text-black/60" />,
                                onClick: () => openPaymentFlow(row.purchase),
                                disabled:
                                    companyActionDisabled ||
                                    isApprovalBlocked,
                                hidden: isApprovalBlocked,
                            },
                            row.purchase.paymentForm === PaymentFormTypes.CREDITO && {
                                id: "quotas",
                                label: "Ver cuotas",
                                icon: <Calendar className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    setModalQuotaList(true);
                                    setPoId(row.purchase.poId ?? "");
                                },
                            },
                            {
                                id: "open-pdf",
                                label: "Abrir pdf",
                                icon: <FileText className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    openPurchasePdf(row.purchase.poId ?? "");
                                },
                            },
                            row.purchase.status === PurchaseOrderStatuses.RECEIVED && {
                                id: "fiscal-documents",
                                label: "Comprobantes fiscales",
                                icon: <FileText className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    const nextPoId = row.purchase.poId ?? "";
                                    if (!nextPoId) return;
                                    setFiscalDocumentsPoId(nextPoId);
                                },
                            },
                            row.purchase.paymentForm === PaymentFormTypes.CREDITO && {
                                id: "list-payments",
                                label: "Listar pagos",
                                icon: <List className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    setModalPaymentList(true);
                                    setPoId(row.purchase.poId ?? "");
                                    setTotalPo(row.purchase.total);
                                    setPaymentForm(row.purchase.paymentForm ?? "");
                                },
                            },
                            row.purchase.status === PurchaseOrderStatuses.DRAFT && {
                                id: "edit",
                                label: "Editar",
                                icon: <Pencil className="h-4 w-4 text-black/60" />,
                                onClick: () => {
                                    const nextPoId = row.purchase.poId ?? "";
                                    if (!nextPoId) return;
                                    setEditPoId(nextPoId);
                                    setOpenPurchaseModal(true);
                                },
                                disabled: companyActionDisabled,
                            },
                            (row.purchase.status === PurchaseOrderStatuses.DRAFT || row.purchase.status === PurchaseOrderStatuses.RECEIVED) && {
                                id: "cancel",
                                label: row.purchase.status === PurchaseOrderStatuses.RECEIVED ? "Eliminar pedido" : "Cancelar",
                                className: "text-rose-700 hover:bg-rose-50",
                                icon: <XCircle className="h-4 w-4" />,
                                onClick: () => cancelOrder(row.purchase.poId ?? ""),
                                disabled: companyActionDisabled || (row.purchase.status === PurchaseOrderStatuses.RECEIVED && !canDeleteProcessedPurchase),
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
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03] ${action.className ?? ""}`}
                                disabled={action.disabled}
                            >
                                {action.icon}
                                {action.label}
                            </button>
                        )}
                    />
                    )}
                </div>
                );
            },
            className: "text-left",
            hideable: true,
            sortable: false,
        },
    ], [
        approveProcessing,
        EnterToWarehouse,
        canApproveCreationWithPayment,
        canApproveProcessing,
        canDeleteProcessedPurchase,
        canReceivePurchase,
        can,
        cancelOrder,
        companyActionDisabled,
        loadPurchases,
        navigate,
        now,
        openPurchasePdf,
        requestProcessing,
        setSent,
        showFeedback,
    ]);

    const smartSearchColumns = useMemo(
        () => buildPurchaseSmartSearchColumns(searchState),
        [searchState],
    );

    const recentSearches = useMemo<DataTableRecentSearchItem<PurchaseSearchSnapshot>[]>(
        () =>
            (searchState?.recent ?? []).map((item) => ({
                id: item.recentId,
                label: item.label,
                snapshot: item.snapshot,
            })),
        [searchState],
    );

    const savedMetrics = useMemo<DataTableSavedSearchItem<PurchaseSearchSnapshot>[]>(
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
        () => buildPurchaseSearchChips(executedSnapshot, searchState),
        [executedSnapshot, searchState],
    );

    const applySmartSnapshot = useCallback((snapshot: PurchaseSearchSnapshot) => {
        const normalized = sanitizePurchaseSearchSnapshot(snapshot);
        startTransition(() => {
            setSearchText(normalized.q ?? "");
            setAppliedSearchText(normalized.q ?? "");
            setSearchFilters(normalized.filters);
            setPage(1);
        });
    }, []);

    const handleApplySearchRule = useCallback((rule: PurchaseSearchRule) => {
        startTransition(() => {
            setSearchFilters((current) => {
                const next = upsertPurchaseSearchRule(
                    sanitizePurchaseSearchSnapshot({ q: searchText, filters: current }),
                    rule,
                );
                return next.filters;
            });
            setPage(1);
        });
    }, [searchText]);

    const handleRemoveSearchRule = useCallback((fieldId: PurchaseSearchFilterKey) => {
        startTransition(() => {
            setSearchFilters((current) => {
                const next = removePurchaseSearchKey(
                    sanitizePurchaseSearchSnapshot({ q: searchText, filters: current }),
                    fieldId,
                );
                return next.filters;
            });
            setPage(1);
        });
    }, [searchText]);

    const handleRemoveChip = useCallback((key: "q" | PurchaseSearchFilterKey) => {
        const nextSnapshot = removePurchaseSearchKey(
            sanitizePurchaseSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
            key,
        );
        startTransition(() => {
            setSearchText(nextSnapshot.q ?? "");
            setAppliedSearchText(nextSnapshot.q ?? "");
            setSearchFilters(nextSnapshot.filters);
            setPage(1);
        });
    }, [appliedSearchText, searchFilters]);

    const handleDateRangeChange = useCallback(({ startDate, endDate }: { startDate: Date | null; endDate: Date | null }) => {
        startTransition(() => {
            setFromDate(startDate ? toLocalDateKey(startDate) : "");
            setToDate(endDate ? toLocalDateKey(endDate) : "");
            setPage(1);
        });
    }, []);

    const handlePageChange = useCallback((nextPage: number) => {
        startTransition(() => {
            setPage(nextPage);
        });
    }, []);

    const handleSaveMetric = useCallback(async (name: string) => {
        const snapshot = sanitizePurchaseSearchSnapshot({ q: appliedSearchText, filters: searchFilters });
        if (!hasPurchaseSearchCriteria(snapshot)) return false;

        setSavingMetric(true);
        try {
            const response = await savePurchaseSearchMetric(name, snapshot);
            if (response.type === "success") {
                showFeedback({ type: "success", message: response.message });
                await loadSearchState();
                return true;
            } else {
                showFeedback({ type: "error", message: response.message });
                return false;
            }
        } catch {
            showFeedback({ type: "error", message: "Error al guardar la metrica" });
            return false;
        } finally {
            setSavingMetric(false);
        }
    }, [appliedSearchText, loadSearchState, searchFilters, showFeedback]);

    const handleDeleteMetric = useCallback(async (metricId: string) => {
        try {
            const response = await deletePurchaseSearchMetric(metricId);
            if (response.type === "success") {
                showFeedback({ type: "success", message: response.message });
                await loadSearchState();
            } else {
                showFeedback({ type: "error", message: response.message });
            }
        } catch {
            showFeedback({ type: "error", message: "Error al eliminar la metrica" });
        }
    }, [loadSearchState, showFeedback]);

    const handleExport = useCallback(async (columnsToExport: PurchaseExportColumn[]) => {
        setExporting(true);
        try {
            const file = await exportPurchaseOrdersExcel({
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
            showFeedback({ type: "success", message: "Excel exportado correctamente" });
        } catch {
            showFeedback({ type: "error", message: "No se pudo exportar el Excel" });
        } finally {
            setExporting(false);
        }
    }, [executedSnapshot.filters, executedSnapshot.q, fromDate, showFeedback, toDate, useTableDateRangeForExport]);

    const handleSaveExportPreset = useCallback(async (payload: { name: string; columns: PurchaseExportColumn[] }) => {
        await savePurchaseExportPreset({
            name: payload.name,
            columns: payload.columns,
            useDateRange: useTableDateRangeForExport,
        });
        await loadExportPresets();
        showFeedback({ type: "success", message: "Preset de exportacion guardado" });
    }, [loadExportPresets, showFeedback, useTableDateRangeForExport]);

    const handleDeleteExportPreset = useCallback(async (metricId: string) => {
        await deletePurchaseExportPreset(metricId);
        await loadExportPresets();
        showFeedback({ type: "success", message: "Preset eliminado" });
    }, [loadExportPresets, showFeedback]);

    return (
        <PageShell className="bg-white">
            <PageTitle title="Compras" />
            <div className="space-y-4">
                <PageActionsRow>
                    <SystemButton
                        className="w-9"
                        size="sm"
                        variant="outline"
                        leftIcon={<AlertCircle className="h-4 w-4" />}
                        onClick={() => setOpenPurchaseTypesInfo(true)}
                        aria-label="Ver tipos de compra"
                    />
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
                        size="sm"
                        leftIcon={<Plus className="h-4 w-4" />}
                        style={{
                            backgroundColor: PRIMARY,
                            borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)`,
                            boxShadow: "0 10px 25px -15px rgba(0,0,0,0.4)",
                        }}
                        onClick={() => {
                            setEditPoId(undefined);
                            setOpenPurchaseModal(true);
                        }}
                        disabled={companyActionDisabled || !canCreatePurchase}
                        title={!canCreatePurchase ? "No tienes permiso para crear compras." : companyActionTitle}
                    >
                        Nueva compra
                    </SystemButton>
                </PageActionsRow>

                <DataTableSearchChips
                    chips={searchChips}
                    onRemove={(chip) => handleRemoveChip(chip.removeKey)}
                />

                <DataTable
                    tableId="purchase-list"
                    data={purchaseRows}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    emptyMessage="No hay compras con los filtros actuales."
                    hoverable={false}
                    animated={false}
                    selectableColumns
                    toolbarSearchContent={
                        <DataTableSearchBar
                            value={searchText}
                            onChange={handleSearchTextChange}
                            onSubmitSearch={submitSearch}
                            searchLabel="Busca tu compra"
                            searchName="purchase-smart-search"
                            canSaveMetric={hasPurchaseSearchCriteria(executedSnapshot)}
                            saveLoading={savingMetric}
                            onSaveMetric={handleSaveMetric}
                        >
                            <PurchaseSmartSearchPanel
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
                        onChange: handleDateRangeChange,
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
                    onRowClick={(row) => {
                        if (!row.purchase.poId) return;
                        setSelectedPurchaseRow(row);
                    }}
                    onPageChange={handlePageChange}
                    tableClassName="text-[10px]"
                />

                {error && <div className="px-5 py-4 text-[10px] text-rose-600">{error}</div>}
            </div>

            <PurchaseModal
                open={openPurchaseModal}
                poId={editPoId}
                onClose={() => {
                    setOpenPurchaseModal(false);
                    setEditPoId(undefined);
                }}
                onSaved={async () => {
                    await loadPurchases();
                    setOpenPurchaseModal(false);
                    setEditPoId(undefined);
                }}
            />
            <PurchaseDetailsModal
                open={Boolean(selectedPurchaseRow)}
                poId={selectedPurchaseRow?.purchase.poId ?? null}
                purchase={
                    selectedPurchaseRow
                        ? {
                            ...selectedPurchaseRow.purchase,
                            supplierLabel: selectedPurchaseRow.supplierLabel,
                            supplierDoc: selectedPurchaseRow.supplierDoc,
                            warehouseLabel: selectedPurchaseRow.warehouseLabel,
                            statusLabel: selectedPurchaseRow.statusLabel,
                            docLabel: selectedPurchaseRow.docLabel,
                            numero: selectedPurchaseRow.numero,
                            date: selectedPurchaseRow.date,
                            time: selectedPurchaseRow.time,
                            dateEnter: selectedPurchaseRow.dateEnter,
                            timeEnter: selectedPurchaseRow.timeEnter,
                        }
                        : null
                }
                onClose={() => {
                    setSelectedPurchaseRow(null);
                }}
            />
            <PaymentListModal
                title="Pagos"
                close={() => {
                    setModalPaymentList(false);
                }}
                poId={poId}
                open={modalPaymentList}
                total={totalPo}
                className="w-[800px]"
                loadPurchases={loadPurchases}
                credit={paymentForm === PaymentFormTypes.CONTADO ? false : true}
            />
            <QuotaListModal
                title="Cuotas"
                close={() => {
                    setModalQuotaList(false);
                }}
                open={modalQuotaList}
                poId={poId}
                className="w-[800px]"
                loadPurchases={loadPurchases}
            />
            {paymentSetupForm && (
                <PurchasePaymentModal
                    open={Boolean(paymentSetupForm)}
                    onClose={() => setPaymentSetupForm(null)}
                    form={paymentSetupForm}
                    setForm={setPaymentSetupDraft}
                    totalPrice={paymentSetupForm.total}
                    primaryColor={PRIMARY}
                    currency={paymentSetupForm.currency}
                    formatMoney={money}
                    onSave={savePaymentSetup}
                    saveDisabled={paymentSetupSaveDisabled}
                    title="Definir forma de pago"
                    className="max-w-[800px]"
                />
            )}
            <PdfViewerModal
                open={openPdfModal}
                onClose={() => {
                    setOpenPdfModal(false);
                    setSelectedProductionId(null);
                }}
                title="Orden de compra"
                loadWhen={Boolean(selectedProductionId)}
                reloadKey={selectedProductionId}
                getPdf={() => getPurchaseOrderPdf(selectedProductionId!)}
            />
            <ExtraTimeModal
                open={Boolean(extraTimePoId)}
                loading={extraTimeLoading}
                onClose={() => setExtraTimePoId(null)}
                onConfirm={addExtraTime}
            />
            <PurchaseCompletionPhotoModal
                open={Boolean(completedPhotoPo)}
                loading={completedPhotoLoading}
                onClose={() => setCompletedPhotoPo(null)}
                onConfirm={uploadCompletedPhoto}
                onCancelWithoutPhoto={skipCompletedPhoto}
            />
            <PurchaseTypesInfoModal
                open={openPurchaseTypesInfo}
                onClose={() => setOpenPurchaseTypesInfo(false)}
            />
            <PurchaseFiscalDocumentsModal
                open={Boolean(fiscalDocumentsPoId)}
                purchaseId={fiscalDocumentsPoId}
                onClose={() => setFiscalDocumentsPoId(null)}
            />
        </PageShell>
    );
}




