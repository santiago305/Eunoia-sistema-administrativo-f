import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Purchases from "./PurchaseListPage";

const {
    listPurchaseOrdersMock,
    getPurchaseSearchStateMock,
    getPurchaseExportColumnsMock,
    getPurchaseExportPresetsMock,
} = vi.hoisted(() => ({
    listPurchaseOrdersMock: vi.fn(),
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
    listPurchaseOrders: listPurchaseOrdersMock,
    rejectCreationWithPayment: vi.fn(),
    rejectProcessingPurchaseOrder: vi.fn(),
    requestProcessingPurchaseOrder: vi.fn(),
    savePurchaseExportPreset: vi.fn(),
    savePurchaseSearchMetric: vi.fn(),
    setCancelPurchase: vi.fn(),
    setSentPurchase: vi.fn(),
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
        </section>
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
    PaymentListModal: () => null,
}));

vi.mock("@/features/purchases/components/QuotaListModal", () => ({
    QuotaListModal: () => null,
}));

vi.mock("@/features/purchases/components/PurchaseModal", () => ({
    PurchaseModal: () => null,
}));

vi.mock("@/features/purchases/components/PurchaseDetailsModal", () => ({
    PurchaseDetailsModal: () => null,
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
});
