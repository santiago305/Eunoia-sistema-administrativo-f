import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecurringPurchasesPage from "./RecurringPurchasesPage";

const {
  listRecurringPurchasesMock,
  createRecurringPurchaseMock,
  pauseRecurringPurchaseMock,
  resumeRecurringPurchaseMock,
  cancelRecurringPurchaseMock,
  generateCurrentRecurringPayableMock,
  getRecurringPurchaseSearchStateMock,
  saveRecurringPurchaseSearchMetricMock,
  deleteRecurringPurchaseSearchMetricMock,
} = vi.hoisted(() => ({
  listRecurringPurchasesMock: vi.fn(),
  createRecurringPurchaseMock: vi.fn(),
  pauseRecurringPurchaseMock: vi.fn(),
  resumeRecurringPurchaseMock: vi.fn(),
  cancelRecurringPurchaseMock: vi.fn(),
  generateCurrentRecurringPayableMock: vi.fn(),
  getRecurringPurchaseSearchStateMock: vi.fn(),
  saveRecurringPurchaseSearchMetricMock: vi.fn(),
  deleteRecurringPurchaseSearchMetricMock: vi.fn(),
}));

vi.mock("@/shared/services/recurringPurchaseService", () => ({
  listRecurringPurchases: listRecurringPurchasesMock,
  createRecurringPurchase: createRecurringPurchaseMock,
  pauseRecurringPurchase: pauseRecurringPurchaseMock,
  resumeRecurringPurchase: resumeRecurringPurchaseMock,
  cancelRecurringPurchase: cancelRecurringPurchaseMock,
  generateCurrentRecurringPayable: generateCurrentRecurringPayableMock,
  getRecurringPurchaseSearchState: getRecurringPurchaseSearchStateMock,
  saveRecurringPurchaseSearchMetric: saveRecurringPurchaseSearchMetricMock,
  deleteRecurringPurchaseSearchMetric: deleteRecurringPurchaseSearchMetricMock,
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: vi.fn() }),
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}));

vi.mock("@/shared/components/components/PageTitle", () => ({
  PageTitle: () => null,
}));

vi.mock("@/shared/components/table/DataTable", () => ({
  DataTable: (props: {
    tableId: string;
    toolbarSearchContent?: React.ReactNode;
    pagination?: { page: number; limit: number; total: number };
  }) => (
    <section data-testid="recurring-data-table" data-table-id={props.tableId}>
      {props.toolbarSearchContent}
      {props.pagination ? (
        <span data-testid="recurring-pagination">
          {props.pagination.page}-{props.pagination.limit}-{props.pagination.total}
        </span>
      ) : null}
    </section>
  ),
}));

vi.mock("@/shared/components/table/search", () => ({
  DataTableSearchBar: ({
    value,
    onChange,
    onSubmitSearch,
    canSaveMetric,
    onSaveMetric,
    children,
  }: {
    value: string;
    onChange: (value: string) => void;
    onSubmitSearch: () => void;
    canSaveMetric?: boolean;
    onSaveMetric?: (name: string) => Promise<boolean>;
    children?: React.ReactNode;
  }) => (
    <div data-testid="recurring-search-bar">
      <input
        aria-label="Buscar recurrente"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="button" onClick={onSubmitSearch}>
        Buscar
      </button>
      {canSaveMetric ? (
        <button type="button" onClick={() => void onSaveMetric?.("Mis recurrentes")}>
          Guardar metrica
        </button>
      ) : null}
      {children}
    </div>
  ),
  DataTableSearchChips: ({ chips }: { chips: Array<{ label: string }> }) => (
    <div data-testid="recurring-search-chips">
      {chips.map((chip) => (
        <span key={chip.label}>{chip.label}</span>
      ))}
    </div>
  ),
  SmartSearchPanel: ({
    recent,
    saved,
    onApplyRule,
    onApplySnapshot,
    onDeleteMetric,
  }: {
    recent?: Array<{ label: string; snapshot: { q?: string; filters: unknown[] } }>;
    saved?: Array<{ id: string; name: string; label: string; snapshot: { q?: string; filters: unknown[] } }>;
    onApplyRule: (rule: { field: string; operator: string; values: string[] }) => void;
    onApplySnapshot?: (snapshot: { q?: string; filters: unknown[] }) => void;
    onDeleteMetric?: (metricId: string) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onApplyRule({ field: "status", operator: "in", values: ["ACTIVE"] })}
      >
        Filtrar activas
      </button>
      {recent?.map((item) => (
        <button key={item.label} type="button" onClick={() => onApplySnapshot?.(item.snapshot)}>
          Reciente: {item.label}
        </button>
      ))}
      {saved?.map((item) => (
        <div key={item.id}>
          <button type="button" onClick={() => onApplySnapshot?.(item.snapshot)}>
            Guardada: {item.name}
          </button>
          <button type="button" onClick={() => onDeleteMetric?.(item.id)}>
            Eliminar {item.name}
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../components/recurrent/RecurringPurchaseFormModal", () => ({
  RecurringPurchaseFormModal: () => null,
}));

vi.mock("../components/recurrent/RecurringPurchasePaymentModal", () => ({
  RecurringPurchasePaymentModal: () => null,
}));

vi.mock("../components/recurrent/RecurringPurchaseTypesInfoModal", () => ({
  RecurringPurchaseTypesInfoModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="recurring-types-info-modal">Tipos recurrentes</div> : null,
}));

describe("RecurringPurchasesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecurringPurchasesMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    });
    getRecurringPurchaseSearchStateMock.mockResolvedValue({
      recent: [
        {
          recentId: "recent-1",
          label: "Busqueda: hosting",
          snapshot: { q: "hosting", filters: [] },
          lastUsedAt: "2026-07-12T10:00:00.000Z",
        },
      ],
      saved: [
        {
          metricId: "metric-1",
          name: "Activas",
          label: "Estado: Activa",
          snapshot: {
            filters: [{ field: "status", operator: "in", values: ["ACTIVE"] }],
          },
          updatedAt: "2026-07-12T11:00:00.000Z",
        },
      ],
      catalogs: {
        suppliers: [{ id: "supplier-1", label: "Proveedor Uno" }],
        statuses: [{ id: "ACTIVE", label: "Activa" }],
        frequencies: [{ id: "MONTHLY", label: "Mensual" }],
        purchaseTypes: [{ id: "SUBSCRIPTION", label: "Suscripcion" }],
        currencies: [{ id: "PEN", label: "PEN" }],
        paymentStatuses: [{ id: "PENDING", label: "Pendiente" }],
      },
    });
    saveRecurringPurchaseSearchMetricMock.mockResolvedValue({ type: "success", message: "Metrica guardada" });
    deleteRecurringPurchaseSearchMetricMock.mockResolvedValue({ type: "success", message: "Metrica eliminada" });
  });

  it("uses smart search with 25 pagination and removes the old heading and refresh button", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RecurringPurchasesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("recurring-data-table")).toHaveAttribute(
      "data-table-id",
      "recurring-purchases-table",
    );
    expect(screen.getByTestId("recurring-search-bar")).toBeInTheDocument();
    expect(screen.getByTestId("recurring-pagination")).toHaveTextContent("1-25-0");
    expect(screen.queryByRole("heading", { name: "Compras recurrentes" })).not.toBeInTheDocument();
    expect(screen.queryByText("Membresias, servicios y suscripciones que generan cuentas por pagar por periodo.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actualizar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver tipos recurrentes" })).toBeInTheDocument();
    expect(getRecurringPurchaseSearchStateMock).toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Reciente: Busqueda: hosting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardada: Activas" })).toBeInTheDocument();

    await waitFor(() => {
      expect(listRecurringPurchasesMock).toHaveBeenCalledWith({
        page: 1,
        limit: 25,
        q: undefined,
        filters: undefined,
      });
    });

    await user.type(screen.getByLabelText("Buscar recurrente"), "hosting");
    await user.click(screen.getByRole("button", { name: "Filtrar activas" }));
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(listRecurringPurchasesMock).toHaveBeenLastCalledWith({
        page: 1,
        limit: 25,
        q: "hosting",
        filters: [
          {
            field: "status",
            operator: "in",
            mode: "include",
            values: ["ACTIVE"],
          },
        ],
      });
    });

    await user.click(screen.getByRole("button", { name: "Guardar metrica" }));
    await waitFor(() => {
      expect(saveRecurringPurchaseSearchMetricMock).toHaveBeenCalledWith("Mis recurrentes", {
        q: "hosting",
        filters: [
          {
            field: "status",
            operator: "in",
            mode: "include",
            values: ["ACTIVE"],
          },
        ],
      });
    });

    await user.click(screen.getByRole("button", { name: "Eliminar Activas" }));
    expect(deleteRecurringPurchaseSearchMetricMock).toHaveBeenCalledWith("metric-1");
  });

  it("opens recurring type explanations from the alert icon action", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RecurringPurchasesPage />
      </MemoryRouter>,
    );

    await screen.findByTestId("recurring-data-table");
    await user.click(screen.getByRole("button", { name: "Ver tipos recurrentes" }));

    expect(screen.getByTestId("recurring-types-info-modal")).toBeInTheDocument();
  });
});
