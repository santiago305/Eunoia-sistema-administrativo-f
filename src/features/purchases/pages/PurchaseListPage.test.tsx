import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Purchases from "./PurchaseListPage";

const {
    listPurchaseOrdersMock,
    updatePurchaseOrderMock,
    listPaymentsMock,
    uploadPurchaseAttachmentMock,
    getPurchaseSearchStateMock,
    getPurchaseExportColumnsMock,
    getPurchaseExportPresetsMock,
} = vi.hoisted(() => ({
    listPurchaseOrdersMock: vi.fn(),
    updatePurchaseOrderMock: vi.fn(),
    listPaymentsMock: vi.fn(),
    uploadPurchaseAttachmentMock: vi.fn(),
    getPurchaseSearchStateMock: vi.fn(),
    getPurchaseExportColumnsMock: vi.fn(),
    getPurchaseExportPresetsMock: vi.fn(),
}));

vi.mock("@/shared/services/purchaseService", () => ({
    approveCreationWithPayment: vi.fn(),
    approveProcessingPurchaseOrder: vi.fn(),
    confirmPurchaseReception: vi.fn(),
    deletePurchaseExportPreset: vi.fn(),
    deletePurchaseSearchMetric: vi.fn(),
    enterPurchaseOrder: vi.fn(),
    exportPurchaseOrdersExcel: vi.fn(),
    getPurchaseExportColumns: getPurchaseExportColumnsMock,
    getPurchaseExportPresets: getPurchaseExportPresetsMock,
    getPurchaseSearchState: getPurchaseSearchStateMock,
    listPayments: listPaymentsMock,
    listPurchaseOrders: listPurchaseOrdersMock,
    rejectCreationWithPayment: vi.fn(),
    rejectProcessingPurchaseOrder: vi.fn(),
    requestProcessingPurchaseOrder: vi.fn(),
    savePurchaseExportPreset: vi.fn(),
    savePurchaseSearchMetric: vi.fn(),
    setCancelPurchase: vi.fn(),
    setSentPurchase: vi.fn(),
    updatePurchaseOrder: updatePurchaseOrderMock,
}));

vi.mock("@/shared/services/purchaseAttachmentService", () => ({
    uploadPurchaseAttachment: uploadPurchaseAttachmentMock,
}));

vi.mock("@/shared/services/paymentService", () => ({
    approvePayment: vi.fn(),
}));

vi.mock("@/shared/services/pdfServices", () => ({
    getPurchaseOrderPdf: vi.fn(),
}));

vi.mock("@/features/purchases/utils/purchaseActions", () => ({
    addPurchaseExtraTime: vi.fn(),
    uploadPurchaseImageProdution: vi.fn(),
}));

vi.mock("@/shared/hooks/useCompany", () => ({
    useCompany: () => ({ hasCompany: true }),
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
    usePermissions: () => ({
        can: () => true,
        canAny: () => true,
    }),
}));

vi.mock("@/shared/components/components/PageTitle", () => ({
    PageTitle: ({ title }: { title: string }) => <div data-testid="page-title">{title}</div>,
}));

vi.mock("@/shared/components/table/DataTable", () => ({
    DataTable: (props: {
        tableId: string;
        data?: Array<Record<string, unknown>>;
        columns?: Array<{
            id: string;
            cell?: (row: Record<string, unknown>) => React.ReactNode;
        }>;
        selectableColumns?: boolean;
        toolbarSearchContent?: React.ReactNode;
        rangeDates?: unknown;
        pagination?: { page: number; limit: number; total: number };
    }) => (
        <section data-testid="purchase-data-table" data-table-id={props.tableId}>
            {props.selectableColumns ? <span data-testid="selectable-columns" /> : null}
            {props.rangeDates ? <span data-testid="date-range-filter" /> : null}
            {props.pagination ? (
                <span data-testid="table-pagination">
                    {props.pagination.page}-{props.pagination.limit}-{props.pagination.total}
                </span>
            ) : null}
            {props.toolbarSearchContent}
            {(props.data ?? []).map((row, rowIndex) => (
                <div key={String(row.id ?? rowIndex)}>
                    {(props.columns ?? []).map((column) => (
                        <div key={column.id}>{column.cell?.(row)}</div>
                    ))}
                </div>
            ))}
        </section>
    ),
}));

vi.mock("@/shared/components/components/ActionsPopover", () => ({
    ActionsPopover: ({ actions }: { actions: Array<{ id: string; label: string; hidden?: boolean; onClick?: () => void }> }) => (
        <div data-testid="actions-popover">
            {actions.filter((action) => !action.hidden).map((action) => (
                <button key={action.id} type="button" onClick={action.onClick}>
                    {action.label}
                </button>
            ))}
        </div>
    ),
}));

vi.mock("@/shared/components/table/search", () => ({
    DataTableSearchBar: ({ children }: { children?: React.ReactNode }) => (
        <div data-testid="purchase-search-bar">{children}</div>
    ),
    DataTableSearchChips: () => <div data-testid="purchase-search-chips" />,
}));

vi.mock("@/features/purchases/components/PurchaseSmartSearchPanel", () => ({
    PurchaseSmartSearchPanel: () => <div data-testid="purchase-smart-search-panel" />,
}));

vi.mock("@/features/purchases/components/PaymentModal", () => ({
    PaymentModal: () => null,
}));

vi.mock("@/features/purchases/components/PaymentListModal", () => ({
    PaymentListModal: ({ open, credit }: { open: boolean; credit?: boolean }) =>
        open ? <div data-testid="payment-list-modal" data-credit={String(Boolean(credit))} /> : null,
}));

vi.mock("@/features/purchases/components/QuotaListModal", () => ({
    QuotaListModal: ({ open }: { open: boolean }) =>
        open ? <div data-testid="quota-list-modal" /> : null,
}));

vi.mock("@/features/purchases/components/PurchaseModal", () => ({
    PurchaseModal: () => null,
}));

type MockPurchasePaymentForm = {
    paymentForm?: string;
    creditDays?: number;
    numQuotas?: number;
    payments?: Array<Record<string, unknown>>;
    quotas?: Array<Record<string, unknown>>;
};

vi.mock("@/features/purchases/components/PurchasePaymentModal", () => ({
    PurchasePaymentModal: ({
        form,
        setForm,
        onSave,
    }: {
        form: { paymentForm?: string };
        setForm: React.Dispatch<React.SetStateAction<MockPurchasePaymentForm>>;
        onSave: () => void;
    }) => (
        <div data-testid="purchase-payment-setup-modal" data-payment-form={form.paymentForm ?? ""}>
            <button
                type="button"
                onClick={() =>
                    setForm((prev) => ({
                        ...prev,
                        paymentForm: "CREDITO",
                        creditDays: 30,
                        numQuotas: 1,
                        payments: [],
                        quotas: [
                            {
                                number: 1,
                                expirationDate: "2026-07-27",
                                totalToPay: 100,
                                totalPaid: 0,
                            },
                        ],
                    }))
                }
            >
                Elegir credito
            </button>
            <button
                type="button"
                onClick={() =>
                    setForm((prev) => ({
                        ...prev,
                        paymentForm: "CONTADO",
                        payments: [
                            {
                                method: "BCP",
                                date: "2026-07-04",
                                currency: "PEN",
                                amount: 100,
                                operationNumber: "OP-1",
                                paymentEvidenceFile: new File(["voucher"], "voucher.png", { type: "image/png" }),
                            },
                        ],
                        quotas: [],
                    }))
                }
            >
                Elegir contado con voucher
            </button>
            <button type="button" onClick={onSave}>
                Guardar forma de pago
            </button>
        </div>
    ),
}));

vi.mock("@/features/purchases/components/PurchaseDetailsModal", () => ({
    PurchaseDetailsModal: () => null,
}));

vi.mock("@/features/purchases/components/timeline/PurchaseHistoryTimelineModal", () => ({
    PurchaseHistoryTimelineModal: ({ open, purchase }: { open: boolean; purchase: { poId?: string } | null }) =>
        open ? <div data-testid="purchase-history-modal" data-purchase-id={purchase?.poId ?? ""} /> : null,
}));

vi.mock("@/features/purchases/components/ExtraTimeModal", () => ({
    ExtraTimeModal: () => null,
}));

vi.mock("@/features/purchases/components/PurchaseCompletionPhotoModal", () => ({
    PurchaseCompletionPhotoModal: () => null,
}));

vi.mock("@/features/purchases/components/PurchaseTypesInfoModal", () => ({
    PurchaseTypesInfoModal: () => null,
}));

vi.mock("@/shared/components/components/ModalOpenPdf", () => ({
    PdfViewerModal: () => null,
}));

vi.mock("sileo", () => ({
    sileo: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
    },
}));

describe("PurchaseListPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        listPurchaseOrdersMock.mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            limit: 25,
        });
        getPurchaseSearchStateMock.mockResolvedValue({
            recent: [],
            saved: [],
            catalogs: {
                suppliers: [],
                warehouses: [],
                statuses: [],
                documentTypes: [],
                paymentForms: [],
            },
        });
        getPurchaseExportColumnsMock.mockResolvedValue([]);
        getPurchaseExportPresetsMock.mockResolvedValue([]);
        updatePurchaseOrderMock.mockResolvedValue({ type: "success", message: "Compra actualizada." });
        listPaymentsMock.mockResolvedValue([]);
        uploadPurchaseAttachmentMock.mockResolvedValue({ type: "success", message: "Comprobante subido." });
    });

    it("renders the central purchase page with shared table, smart search, chips and date range", async () => {
        render(
            <MemoryRouter>
                <Purchases />
            </MemoryRouter>,
        );

        expect(await screen.findByTestId("purchase-data-table")).toHaveAttribute("data-table-id", "purchase-list");
        expect(screen.getByTestId("page-title")).toHaveTextContent("Compras");
        expect(screen.getByTestId("purchase-search-bar")).toBeInTheDocument();
        expect(screen.getByTestId("purchase-search-chips")).toBeInTheDocument();
        expect(screen.getByTestId("purchase-smart-search-panel")).toBeInTheDocument();
        expect(screen.getByTestId("date-range-filter")).toBeInTheDocument();
        expect(screen.getByTestId("table-pagination")).toHaveTextContent("1-25-0");
        expect(screen.getByTestId("selectable-columns")).toBeInTheDocument();

        await waitFor(() => {
            expect(listPurchaseOrdersMock).toHaveBeenCalledWith({
                page: 1,
                limit: 25,
                q: undefined,
                filters: undefined,
                from: undefined,
                to: undefined,
            });
        });
    });

    it("shows fiscal documents action only for received purchases", async () => {
        listPurchaseOrdersMock.mockResolvedValueOnce({
            items: [
                {
                    poId: "po-received",
                    serie: "F001",
                    correlative: "1",
                    supplierName: "Proveedor recibido",
                    warehouseName: "Almacen",
                    purchaseType: "INVENTORY",
                    status: "RECEIVED",
                    documentType: "FACTURA",
                    dateIssue: "2026-06-27T10:00:00.000Z",
                    expectedAt: "2026-06-27T10:00:00.000Z",
                    total: 100,
                    totalPaid: 100,
                    totalToPay: 0,
                    paymentForm: "CONTADO",
                },
                {
                    poId: "po-draft",
                    serie: "F001",
                    correlative: "2",
                    supplierName: "Proveedor borrador",
                    warehouseName: "Almacen",
                    purchaseType: "INVENTORY",
                    status: "DRAFT",
                    documentType: "FACTURA",
                    dateIssue: "2026-06-27T10:00:00.000Z",
                    expectedAt: "2026-06-27T10:00:00.000Z",
                    total: 100,
                    totalPaid: 0,
                    totalToPay: 100,
                    paymentForm: "CONTADO",
                },
            ],
            total: 2,
            page: 1,
            limit: 25,
        });

        render(
            <MemoryRouter>
                <Purchases />
            </MemoryRouter>,
        );

        expect(await screen.findByText("Comprobantes fiscales")).toBeInTheDocument();
        expect(screen.getAllByTestId("actions-popover")).toHaveLength(2);
        expect(screen.getAllByText("Comprobantes fiscales")).toHaveLength(1);
    });

    it("opens purchase history from the row action popover", async () => {
        listPurchaseOrdersMock.mockResolvedValueOnce({
            items: [
                {
                    poId: "po-history",
                    serie: "F001",
                    correlative: "9",
                    supplierName: "Proveedor historial",
                    warehouseName: "Almacen",
                    purchaseType: "INVENTORY",
                    status: "DRAFT",
                    documentType: "FACTURA",
                    dateIssue: "2026-06-27T10:00:00.000Z",
                    expectedAt: "2026-06-27T10:00:00.000Z",
                    total: 100,
                    totalPaid: 0,
                    totalToPay: 100,
                    paymentForm: "CONTADO",
                },
            ],
            total: 1,
            page: 1,
            limit: 25,
        });

        render(
            <MemoryRouter>
                <Purchases />
            </MemoryRouter>,
        );

        fireEvent.click(await screen.findByRole("button", { name: "Historial" }));

        expect(screen.getByTestId("purchase-history-modal")).toHaveAttribute("data-purchase-id", "po-history");
    });

    it("opens the payment list for cash purchases and the quota flow for credit purchases", async () => {
        listPurchaseOrdersMock.mockResolvedValueOnce({
            items: [
                {
                    poId: "po-cash",
                    serie: "F001",
                    correlative: "1",
                    supplierName: "Proveedor contado",
                    warehouseName: "Almacen",
                    purchaseType: "INVENTORY",
                    status: "DRAFT",
                    documentType: "FACTURA",
                    dateIssue: "2026-06-27T10:00:00.000Z",
                    expectedAt: "2026-06-27T10:00:00.000Z",
                    total: 100,
                    totalPaid: 0,
                    totalToPay: 100,
                    paymentForm: "CONTADO",
                },
                {
                    poId: "po-credit",
                    serie: "F001",
                    correlative: "2",
                    supplierName: "Proveedor credito",
                    warehouseName: "Almacen",
                    purchaseType: "INVENTORY",
                    status: "DRAFT",
                    documentType: "FACTURA",
                    dateIssue: "2026-06-27T10:00:00.000Z",
                    expectedAt: "2026-06-27T10:00:00.000Z",
                    total: 200,
                    totalPaid: 0,
                    totalToPay: 200,
                    paymentForm: "CREDITO",
                },
            ],
            total: 2,
            page: 1,
            limit: 25,
        });

        render(
            <MemoryRouter>
                <Purchases />
            </MemoryRouter>,
        );

        fireEvent.click(await screen.findByRole("button", { name: "Pagos" }));
        expect(screen.getByTestId("payment-list-modal")).toHaveAttribute("data-credit", "false");

        fireEvent.click(screen.getByRole("button", { name: "Ver cuotas" }));
        expect(screen.getByTestId("quota-list-modal")).toBeInTheDocument();
    });

    it("asks for the payment form before opening payments when the purchase has no payment form", async () => {
        listPurchaseOrdersMock.mockResolvedValueOnce({
            items: [
                {
                    poId: "po-without-payment-form",
                    serie: "F001",
                    correlative: "3",
                    supplierId: "supplier-1",
                    supplierName: "Proveedor sin forma",
                    warehouseId: "warehouse-1",
                    warehouseName: "Almacen",
                    purchaseType: "INVENTORY",
                    status: "DRAFT",
                    documentType: "FACTURA",
                    dateIssue: "2026-06-27T10:00:00.000Z",
                    expectedAt: "2026-06-27T10:00:00.000Z",
                    currency: "PEN",
                    totalTaxed: 100,
                    totalExempted: 0,
                    totalIgv: 18,
                    purchaseValue: 100,
                    total: 100,
                    totalPaid: 0,
                    totalToPay: 100,
                    paymentForm: "",
                },
            ],
            total: 1,
            page: 1,
            limit: 25,
        });

        render(
            <MemoryRouter>
                <Purchases />
            </MemoryRouter>,
        );

        fireEvent.click(await screen.findByRole("button", { name: "Pagos" }));

        expect(screen.getByTestId("purchase-payment-setup-modal")).toBeInTheDocument();
        expect(screen.queryByTestId("payment-list-modal")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Elegir credito" }));
        await waitFor(() => {
            expect(screen.getByTestId("purchase-payment-setup-modal")).toHaveAttribute("data-payment-form", "CREDITO");
        });

        fireEvent.click(screen.getByRole("button", { name: "Guardar forma de pago" }));

        await waitFor(() => {
            expect(updatePurchaseOrderMock).toHaveBeenCalledWith(
                "po-without-payment-form",
                expect.objectContaining({
                    paymentForm: "CREDITO",
                    creditDays: 30,
                    numQuotas: 1,
                    payments: [],
                    quotas: [
                        expect.objectContaining({
                            number: 1,
                            totalToPay: 100,
                        }),
                    ],
                }),
            );
        });
        expect(screen.getByTestId("quota-list-modal")).toBeInTheDocument();
    });

    it("uploads payment evidence when saving a cash payment setup from the list", async () => {
        updatePurchaseOrderMock.mockResolvedValueOnce({
            type: "success",
            message: "Compra actualizada.",
            order: {
                poId: "po-without-payment-form",
                payments: [
                    {
                        payDocId: "payment-1",
                        method: "BCP",
                        date: "2026-07-04",
                        currency: "PEN",
                        amount: 100,
                        operationNumber: "OP-1",
                    },
                ],
            },
        });
        listPurchaseOrdersMock.mockResolvedValueOnce({
            items: [
                {
                    poId: "po-without-payment-form",
                    serie: "F001",
                    correlative: "3",
                    supplierId: "supplier-1",
                    supplierName: "Proveedor sin forma",
                    warehouseId: "warehouse-1",
                    warehouseName: "Almacen",
                    purchaseType: "INVENTORY",
                    status: "DRAFT",
                    documentType: "FACTURA",
                    dateIssue: "2026-06-27T10:00:00.000Z",
                    expectedAt: "2026-06-27T10:00:00.000Z",
                    currency: "PEN",
                    totalTaxed: 100,
                    totalExempted: 0,
                    totalIgv: 18,
                    purchaseValue: 100,
                    total: 100,
                    totalPaid: 0,
                    totalToPay: 100,
                    paymentForm: "",
                },
            ],
            total: 1,
            page: 1,
            limit: 25,
        });

        render(
            <MemoryRouter>
                <Purchases />
            </MemoryRouter>,
        );

        fireEvent.click(await screen.findByRole("button", { name: "Pagos" }));
        fireEvent.click(screen.getByRole("button", { name: "Elegir contado con voucher" }));
        fireEvent.click(screen.getByRole("button", { name: "Guardar forma de pago" }));

        await waitFor(() => {
            expect(uploadPurchaseAttachmentMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    purchaseId: "po-without-payment-form",
                    paymentId: "payment-1",
                    type: "PAYMENT_PROOF",
                }),
            );
        });
    });
});
