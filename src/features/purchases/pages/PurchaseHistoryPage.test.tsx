import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PurchaseHistory from "./PurchaseHistoryPage";
import { NOTIFICATION_WINDOW_EVENTS } from "@/features/mail/constants/mail-events.constants";

const {
  getPurchaseHistorySearchStateMock,
  getPurchaseTimelineMock,
  listPurchaseHistoryMock,
  listUsersMock,
} = vi.hoisted(() => ({
  getPurchaseHistorySearchStateMock: vi.fn(),
  getPurchaseTimelineMock: vi.fn(),
  listPurchaseHistoryMock: vi.fn(),
  listUsersMock: vi.fn(),
}));

vi.mock("@/shared/services/purchaseService", () => ({
  getPurchaseHistorySearchState: getPurchaseHistorySearchStateMock,
  getPurchaseTimeline: getPurchaseTimelineMock,
  listPurchaseHistory: listPurchaseHistoryMock,
}));

vi.mock("@/shared/services/userService", () => ({
  listUsers: listUsersMock,
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: vi.fn() }),
}));

vi.mock("@/shared/components/components/PageTitle", () => ({
  PageTitle: ({ title }: { title: string }) => <h1 data-testid="page-title">{title}</h1>,
}));

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: (props: {
    tableId: string;
    columns?: Array<{ id: string; sortable?: boolean }>;
    selectableColumns?: boolean;
    toolbarSearchContent?: React.ReactNode;
    rangeDates?: {
      onChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
    };
    pagination?: { page: number; limit: number; total: number };
    onRowClick?: (row: { poId: string }) => void;
  }) => (
    <section data-testid="history-data-table" data-table-id={props.tableId}>
      {props.selectableColumns ? <span data-testid="history-selectable-columns" /> : null}
      {props.columns?.some((column) => column.sortable) ? <span data-testid="history-sort-buttons" /> : null}
      {props.toolbarSearchContent}
      {props.rangeDates ? (
        <button
          type="button"
          data-testid="history-range-dates"
          onClick={() =>
            props.rangeDates?.onChange({
              startDate: new Date("2026-06-01T00:00:00"),
              endDate: new Date("2026-06-15T00:00:00"),
            })
          }
        >
          rango
        </button>
      ) : null}
      {props.pagination ? (
        <span data-testid="history-pagination">
          {props.pagination.page}-{props.pagination.limit}-{props.pagination.total}
        </span>
      ) : null}
      <button type="button" data-testid="open-timeline" onClick={() => props.onRowClick?.({ poId: "po-1" })}>
        timeline
      </button>
    </section>
  ),
}));

vi.mock("@/shared/components/table/search", () => ({
  DataTableSearchBar: ({
    children,
    onChange,
    onSubmitSearch,
    searchLabel,
  }: {
    children?: React.ReactNode;
    onChange: (value: string) => void;
    onSubmitSearch: () => void;
    searchLabel?: string;
  }) => (
    <div data-testid="history-search-bar" aria-label={searchLabel}>
      <button
        type="button"
        data-testid="submit-history-search"
        onClick={() => {
          onChange("F001");
          onSubmitSearch();
        }}
      >
        buscar
      </button>
      {children}
    </div>
  ),
  DataTableSearchChips: () => <div data-testid="history-search-chips" />,
}));

vi.mock("@/features/purchases/components/PurchaseHistorySmartSearchPanel", () => ({
  PurchaseHistorySmartSearchPanel: ({ onApplyRule }: { onApplyRule: (rule: unknown) => void }) => (
    <button
      type="button"
      data-testid="history-smart-search-panel"
      onClick={() =>
        onApplyRule({
          field: "supplierId",
          operator: "in",
          values: ["supplier-1"],
        })
      }
    >
      panel
    </button>
  ),
}));

vi.mock("@/features/purchases/components/timeline/PurchaseTimelineFilters", () => ({
  PurchaseTimelineFilters: () => <div data-testid="timeline-shared-filters" />,
}));

vi.mock("@/features/purchases/components/timeline/PurchaseTimeline", () => ({
  PurchaseTimeline: () => <div data-testid="purchase-timeline" />,
}));

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="history-modal">{children}</div> : null,
}));

vi.mock("@/shared/components/table/DataTablePagination", () => ({
  DataTablePagination: () => <div data-testid="timeline-pagination" />,
}));

describe("PurchaseHistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPurchaseHistoryMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 15,
    });
    getPurchaseTimelineMock.mockResolvedValue({
      purchaseId: "po-1",
      events: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    getPurchaseHistorySearchStateMock.mockResolvedValue({
      recent: [],
      saved: [],
      catalogs: {
        suppliers: [{ id: "supplier-1", label: "Proveedor demo" }],
        statuses: [],
        events: [{ id: "PROCESSING_REQUESTED", label: "Procesamiento solicitado" }],
        users: [],
      },
    });
    listUsersMock.mockResolvedValue({ items: [] });
  });

  it("renders history with shared DataTable search, chips, date range and no manual refresh button", async () => {
    render(<PurchaseHistory />);

    expect(await screen.findByTestId("history-data-table")).toHaveAttribute("data-table-id", "purchase-history");
    expect(screen.getByTestId("page-title")).toHaveTextContent("Historial de compras");
    expect(screen.getByTestId("history-search-bar")).toBeInTheDocument();
    expect(screen.getByTestId("history-search-chips")).toBeInTheDocument();
    expect(screen.getByTestId("history-smart-search-panel")).toBeInTheDocument();
    expect(screen.getByTestId("history-range-dates")).toBeInTheDocument();
    expect(screen.getByTestId("history-selectable-columns")).toBeInTheDocument();
    expect(screen.getByTestId("history-sort-buttons")).toBeInTheDocument();
    expect(screen.getByTestId("history-search-bar")).toHaveAttribute("aria-label", "Busca tu compra");
    expect(screen.queryByRole("button", { name: /actualizar historial/i })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(listPurchaseHistoryMock).toHaveBeenCalledWith({
        page: 1,
        limit: 15,
        eventType: undefined,
        eventFrom: undefined,
        eventTo: undefined,
        performedByUserId: undefined,
        q: undefined,
        filters: undefined,
      });
    });
  });

  it("maps table date range, smart search and realtime events to backend reloads", async () => {
    render(<PurchaseHistory />);

    await screen.findByTestId("history-data-table");

    fireEvent.click(screen.getByTestId("history-range-dates"));
    await waitFor(() => {
      expect(listPurchaseHistoryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          eventFrom: "2026-06-01",
          eventTo: "2026-06-15",
        }),
      );
    });

    fireEvent.click(screen.getByTestId("submit-history-search"));
    await waitFor(() => {
      expect(listPurchaseHistoryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          q: "F001",
        }),
      );
    });

    fireEvent.click(screen.getByTestId("history-smart-search-panel"));
    await waitFor(() => {
      expect(listPurchaseHistoryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: [
            expect.objectContaining({
              field: "supplierId",
              operator: "in",
              values: ["supplier-1"],
            }),
          ],
        }),
      );
    });

    const callsBeforeRealtime = listPurchaseHistoryMock.mock.calls.length;
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_WINDOW_EVENTS.systemNotificationCreated, {
        detail: {
          notification: {
            metadata: { poId: "po-1", sourceEntityType: "purchase_order" },
          },
        },
      }),
    );

    await waitFor(() => {
      expect(listPurchaseHistoryMock.mock.calls.length).toBeGreaterThan(callsBeforeRealtime);
    });
  });

  it("reloads from the purchase history notification event dispatched by the notification socket layer", async () => {
    render(<PurchaseHistory />);

    await screen.findByTestId("history-data-table");

    const callsBeforeRealtime = listPurchaseHistoryMock.mock.calls.length;
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_WINDOW_EVENTS.purchaseHistoryUpdated, {
        detail: {
          notification: {
            metadata: { poId: "po-1", sourceEntityType: "purchase_order" },
          },
        },
      }),
    );

    await waitFor(() => {
      expect(listPurchaseHistoryMock.mock.calls.length).toBeGreaterThan(callsBeforeRealtime);
    });
  });
});
