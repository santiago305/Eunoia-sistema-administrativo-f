import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SaleOrders from "@/features/sale-orders/SaleOrders";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { ClientType, type SaleOrder } from "@/features/sale-orders/types/saleOrder";

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ hasCompany: true, company: { companyId: "company-1" } }),
}));

const { authState, socketHandlers, createSaleOrdersSocketMock } = vi.hoisted(() => ({
  authState: { isAuthenticated: false, userId: null as string | null },
  socketHandlers: new Map<string, (payload: unknown) => void>(),
  createSaleOrdersSocketMock: vi.fn(() => ({
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      socketHandlers.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      socketHandlers.delete(event);
    }),
  })),
}));

vi.mock("@/shared/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("@/shared/lib/socket", () => ({
  createSaleOrdersSocket: createSaleOrdersSocketMock,
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const {
  deleteSaleOrderExportPresetMock,
  exportSaleOrdersExcelMock,
  fetchSaleOrderByIdMock,
  getAvailableSaleOrderTransitionsMock,
  getSaleOrderExportColumnsMock,
  getSaleOrderExportPresetsMock,
  getSaleOrderSearchStateMock,
  getSaleOrderStatisticsMock,
  listSaleOrdersMock,
  saveSaleOrderExportPresetMock,
} = vi.hoisted(() => ({
  deleteSaleOrderExportPresetMock: vi.fn(),
  exportSaleOrdersExcelMock: vi.fn(),
  fetchSaleOrderByIdMock: vi.fn(),
  getAvailableSaleOrderTransitionsMock: vi.fn(),
  getSaleOrderExportColumnsMock: vi.fn(),
  getSaleOrderExportPresetsMock: vi.fn(),
  getSaleOrderSearchStateMock: vi.fn(),
  getSaleOrderStatisticsMock: vi.fn().mockResolvedValue({
    byWorkflow: [],
    byState: [],
    byClientType: [],
    totals: { orders: 0, total: 0, collected: 0, pending: 0, deliveryCostSum: 0 },
  }),
  listSaleOrdersMock: vi.fn(),
  saveSaleOrderExportPresetMock: vi.fn(),
}));

vi.mock("@/shared/services/saleOrderService", async () => {
  const actual = await vi.importActual<typeof import("@/shared/services/saleOrderService")>(
    "@/shared/services/saleOrderService",
  );

  return {
    ...actual,
    fetchSaleOrderById: fetchSaleOrderByIdMock,
    listSaleOrders: listSaleOrdersMock,
    deleteSaleOrderExportPreset: deleteSaleOrderExportPresetMock,
    exportSaleOrdersExcel: exportSaleOrdersExcelMock,
    getSaleOrderExportColumns: getSaleOrderExportColumnsMock,
    getSaleOrderExportPresets: getSaleOrderExportPresetsMock,
    getSaleOrderSearchState: getSaleOrderSearchStateMock,
    getSaleOrderStatistics: getSaleOrderStatisticsMock,
    getAvailableSaleOrderTransitions: getAvailableSaleOrderTransitionsMock,
    saveSaleOrderExportPreset: saveSaleOrderExportPresetMock,
  };
});

const buildSaleOrder = (stateName: string): SaleOrder => ({
  id: "order-1",
  serie: "SO",
  correlative: 1,
  client: {
    id: "client-1",
    type: ClientType.NEW,
    docType: "DNI",
    fullName: "Cliente Prueba",
    docNumber: "12345678",
    mainPhone: "999999999",
    departmentId: "dep-1",
    provinceId: "prov-1",
    districtId: "dist-1",
    isActive: true,
  },
  warehouse: { id: "warehouse-1", name: "Principal" },
  source: null,
  createdBy: null,
  scheduleDate: "2026-06-15",
  deliveryDate: null,
  workflowId: "workflow-1",
  currentStateId: `state-${stateName}`,
  workflow: { id: "workflow-1", name: "Flujo venta", description: null, isActive: true },
  currentState: {
    id: `state-${stateName}`,
    name: stateName,
    code: stateName.toUpperCase(),
    color: "#64748b",
    isInitial: false,
    isFinal: false,
    isActive: true,
  },
  invoiceSend: false,
  subTotal: 100,
  deliveryCost: 0,
  total: 100,
  note: null,
  agencyDetail: null,
  isActive: true,
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: null,
  totalPaid: 0,
  pendingAmount: 100,
  paymentStatus: "PENDING",
  payments: [],
  items: [],
});

const buildOrderWithComponent = (
  stateName: string,
  component: NonNullable<NonNullable<SaleOrder["items"]>[number]["components"]>[number],
): SaleOrder => ({
  ...buildSaleOrder(stateName),
  items: [
    {
      id: "item-1",
      quantity: 1,
      unitPrice: 20,
      total: 20,
      description: "Pack detalle",
      components: [component],
    },
  ],
});

const emptySearchState = {
  recent: [],
  saved: [],
  catalogs: {
    clients: [],
    warehouses: [],
    paymentStatuses: [],
    workflows: [],
    states: [],
    bankAccounts: [],
    clientTypes: [],
  },
};

describe("SaleOrders", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.userId = null;
    socketHandlers.clear();
    createSaleOrdersSocketMock.mockClear();
    fetchSaleOrderByIdMock.mockReset();
    getAvailableSaleOrderTransitionsMock.mockReset();
    getSaleOrderExportColumnsMock.mockReset();
    getSaleOrderExportPresetsMock.mockReset();
    exportSaleOrdersExcelMock.mockReset();
    saveSaleOrderExportPresetMock.mockReset();
    deleteSaleOrderExportPresetMock.mockReset();
    listSaleOrdersMock.mockReset();
    getSaleOrderSearchStateMock.mockReset();
    getSaleOrderStatisticsMock.mockReset();
    listSaleOrdersMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    getSaleOrderExportColumnsMock.mockResolvedValue([]);
    getSaleOrderExportPresetsMock.mockResolvedValue([]);
    saveSaleOrderExportPresetMock.mockResolvedValue({ metricId: "metric-1" });
    deleteSaleOrderExportPresetMock.mockResolvedValue(true);
    getSaleOrderSearchStateMock.mockResolvedValue(emptySearchState);
    getAvailableSaleOrderTransitionsMock.mockResolvedValue([]);
    getSaleOrderStatisticsMock.mockResolvedValue({
      byWorkflow: [],
      byState: [],
      byClientType: [],
      byBankAccount: [],
      totals: { orders: 0, total: 0, collected: 0, pending: 0, deliveryCostSum: 0 },
    });
  });

  it("renders sale orders in a table without loading statistics", async () => {
    listSaleOrdersMock.mockResolvedValue({
      items: [buildSaleOrder("Pendiente")],
      total: 1,
      page: 1,
      limit: 10,
    });
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: /nuevo pedido/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /tipos/i })).toBeTruthy();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByText("SO-1")).toBeInTheDocument();
    expect(getSaleOrderStatisticsMock).not.toHaveBeenCalled();
  });

  it("applies the createdAt range preset from the table toolbar", async () => {
    const user = userEvent.setup();
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    listSaleOrdersMock.mockResolvedValue({
      items: [buildSaleOrder("Pendiente")],
      total: 1,
      page: 1,
      limit: 10,
    });

    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await screen.findByText("SO-1");
    await user.click(screen.getByRole("button", { name: "Fechas" }));
    await user.click(await screen.findByRole("button", { name: "Ultimos 7 dias" }));

    await waitFor(() => {
      expect(
        listSaleOrdersMock.mock.calls.some(([params]) =>
          params?.filters?.some(
            (rule: { field?: string; operator?: string; range?: { start?: string; end?: string } }) =>
              rule.field === "createdAt" &&
              rule.operator === "between" &&
              rule.range?.start === toDateKey(start) &&
              rule.range?.end === toDateKey(today),
          ),
        ),
      ).toBe(true);
    });
  });

  it("moves the toolbar date range to the selected date field", async () => {
    const user = userEvent.setup();
    listSaleOrdersMock.mockResolvedValue({
      items: [buildSaleOrder("Pendiente")],
      total: 1,
      page: 1,
      limit: 10,
    });

    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await screen.findByText("SO-1");
    await user.click(screen.getByRole("button", { name: "Fechas" }));
    await user.click(await screen.findByRole("button", { name: "Ultimos 7 dias" }));

    await user.click(screen.getByRole("button", { name: "Fechas" }));
    await user.click(await screen.findByRole("button", { name: "Campo fecha: Fecha creacion" }));
    await user.click(await screen.findByRole("option", { name: "Fecha entrega" }));

    await waitFor(() => {
      expect(
        listSaleOrdersMock.mock.calls.some(([params]) =>
          params?.filters?.some(
            (rule: { field?: string; operator?: string; range?: { start?: string; end?: string } }) =>
              rule.field === "deliveryDate" &&
              rule.operator === "between" &&
              Boolean(rule.range?.start) &&
              Boolean(rule.range?.end),
          ),
        ),
      ).toBe(true);
    });
  });

  it("exports sale orders with current smart-search filters", async () => {
    const user = userEvent.setup();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pedidos");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    getSaleOrderExportColumnsMock.mockResolvedValue([{ key: "number", label: "Numero" }]);
    getSaleOrderExportPresetsMock.mockResolvedValue([]);
    exportSaleOrdersExcelMock.mockResolvedValue({
      blob: new Blob(["demo"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      filename: "pedidos.xlsx",
    });
    listSaleOrdersMock.mockResolvedValue({
      items: [buildSaleOrder("Pendiente")],
      total: 1,
      page: 1,
      limit: 10,
    });

    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await screen.findByText("SO-1");
    await user.click(await screen.findByRole("button", { name: /exportar/i }));
    await screen.findByText("Selecciona columnas y orden para Excel.");
    await user.click(screen.getAllByText("Exportar").at(-1)!);

    await waitFor(() => {
      expect(exportSaleOrdersExcelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: [{ key: "number", label: "Numero" }],
        }),
      );
    });
    expect(anchorClick).toHaveBeenCalledTimes(1);

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    anchorClick.mockRestore();
  });

  it("opens the unified modal in create mode from Nuevo pedido", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /nuevo pedido/i }),
    );

    expect(
      await screen.findByRole("heading", { name: "Nuevo pedido" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Detalle de pedido" }),
    ).not.toBeInTheDocument();
  });

  it("opens detail from the row and removes detail from the actions popover", async () => {
    const order = buildSaleOrder("Pendiente");
    listSaleOrdersMock.mockResolvedValue({
      items: [order],
      total: 1,
      page: 1,
      limit: 10,
    });
    fetchSaleOrderByIdMock.mockResolvedValue(order);
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await user.click(await screen.findByText("SO-1"));
    await waitFor(() => expect(fetchSaleOrderByIdMock).toHaveBeenCalledWith("order-1"));

    await user.click(screen.getByRole("button", { name: /acciones del pedido/i }));
    expect(screen.queryByText("Detalle")).not.toBeInTheDocument();
    expect(screen.getByText("Ver PDF")).toBeInTheDocument();
    expect(screen.getByText("Factura")).toBeInTheDocument();
    expect(screen.getByText("Boleta")).toBeInTheDocument();
  });

  it("keeps client, document, phone and advertising code cells from opening detail", async () => {
    const order = {
      ...buildSaleOrder("Pendiente"),
      advertisingCode: "FB-123",
    };
    listSaleOrdersMock.mockResolvedValue({
      items: [order],
      total: 1,
      page: 1,
      limit: 10,
    });
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await screen.findByText("SO-1");

    fireEvent.click(screen.getByText("Cliente Prueba"));
    fireEvent.click(screen.getByText("12345678"));
    fireEvent.click(screen.getByText("999999999"));
    fireEvent.click(screen.getByText("FB-123"));

    expect(fetchSaleOrderByIdMock).not.toHaveBeenCalled();
  });

  it("does not render listed id-only components while loading order detail", async () => {
    let resolveDetail!: (order: SaleOrder) => void;
    const detailPromise = new Promise<SaleOrder>((resolve) => {
      resolveDetail = resolve;
    });
    const listedOrder = buildOrderWithComponent("Pendiente", {
      skuId: "sku-only-id",
      quantity: 1,
      unitPrice: 20,
      total: 20,
    });
    const detailedOrder = buildOrderWithComponent("Pendiente", {
      skuId: "sku-1",
      sku: {
        id: "sku-1",
        backendSku: "10017",
        customSku: "EVA01893",
        name: "JABON AZUFRE",
        barcode: null,
        image: null,
      },
      attributes: [{ code: "variant", name: "Variante", value: "AZUFRE" }],
      quantity: 1,
      unitPrice: 20,
      total: 20,
    });
    listSaleOrdersMock.mockResolvedValue({
      items: [listedOrder],
      total: 1,
      page: 1,
      limit: 10,
    });
    fetchSaleOrderByIdMock.mockReturnValue(detailPromise);
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await user.click(await screen.findByText("SO-1"));

    expect(screen.queryByText("sku-only-id")).not.toBeInTheDocument();

    await act(async () => {
      resolveDetail(detailedOrder);
      await detailPromise;
    });

    expect(await screen.findByText("JABON AZUFRE AZUFRE -10017 (EVA01893)")).toBeInTheDocument();
  });

  it("refreshes the selected order detail when sale-orders.updated arrives without explicit ids", async () => {
    authState.isAuthenticated = true;
    authState.userId = "user-1";
    const initialOrder = buildSaleOrder("Pendiente");
    const refreshedOrder = buildSaleOrder("Confirmado");
    listSaleOrdersMock
      .mockResolvedValueOnce({
        items: [initialOrder],
        total: 1,
        page: 1,
        limit: 10,
      })
      .mockResolvedValue({
        items: [refreshedOrder],
        total: 1,
        page: 1,
        limit: 10,
      });
    fetchSaleOrderByIdMock
      .mockResolvedValueOnce(initialOrder)
      .mockResolvedValueOnce(refreshedOrder);

    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await user.click(await screen.findByText("SO-1"));
    await waitFor(() => expect(fetchSaleOrderByIdMock).toHaveBeenCalledWith("order-1"));
    await waitFor(() => expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0));
    await waitFor(() => expect(socketHandlers.has("sale-orders.updated")).toBe(true));

    await act(async () => {
      socketHandlers.get("sale-orders.updated")?.({ updated: 1, saleOrderIds: [] });
    });

    await waitFor(() => expect(fetchSaleOrderByIdMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByText("Confirmado").length).toBeGreaterThan(0));
    expect(fetchSaleOrderByIdMock).toHaveBeenLastCalledWith("order-1");
  });

  it("uses the saleOrders payload from the websocket to update the selected order without refetching", async () => {
    authState.isAuthenticated = true;
    authState.userId = "user-1";
    const initialOrder = buildSaleOrder("Pendiente");
    const updatedOrder = buildSaleOrder("Confirmado");
    listSaleOrdersMock.mockResolvedValue({
      items: [initialOrder],
      total: 1,
      page: 1,
      limit: 10,
    });
    fetchSaleOrderByIdMock.mockResolvedValue(initialOrder);

    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await user.click(await screen.findByText("SO-1"));
    await waitFor(() => expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0));

    const initialCallCount = fetchSaleOrderByIdMock.mock.calls.length;

    await act(async () => {
      socketHandlers.get("sale-orders.updated")?.({ updated: 1, saleOrderIds: ["order-1"], saleOrders: [updatedOrder] });
    });

    await waitFor(() => expect(screen.getAllByText("Confirmado").length).toBeGreaterThan(0));
    expect(fetchSaleOrderByIdMock).toHaveBeenCalledTimes(initialCallCount);
  });

  it("processes consecutive saleOrders realtime payloads without dropping the latest one", async () => {
    authState.isAuthenticated = true;
    authState.userId = "user-1";
    const initialOrder = buildSaleOrder("Pendiente");
    const firstUpdate = buildSaleOrder("Confirmado");
    const secondUpdate = buildSaleOrder("Entregado");
    listSaleOrdersMock.mockResolvedValue({
      items: [initialOrder],
      total: 1,
      page: 1,
      limit: 10,
    });
    fetchSaleOrderByIdMock.mockResolvedValue(initialOrder);

    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await user.click(await screen.findByText("SO-1"));
    await waitFor(() => expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0));

    await act(async () => {
      socketHandlers.get("sale-orders.updated")?.({
        updated: 1,
        saleOrderIds: ["order-1"],
        source: "workflow-state-changed",
        saleOrders: [firstUpdate],
      });
      socketHandlers.get("sale-orders.updated")?.({
        updated: 1,
        saleOrderIds: ["order-1"],
        source: "automatic-workflow",
        trigger: "payment-created",
        saleOrders: [secondUpdate],
      });
    });

    await waitFor(() => expect(screen.getAllByText("Entregado").length).toBeGreaterThan(0));
  });

  it("uses imported saleOrders payloads without reloading orders", async () => {
    authState.isAuthenticated = true;
    authState.userId = "user-1";
    const initialOrder = buildSaleOrder("Pendiente");
    const updatedOrder = buildSaleOrder("Confirmado");
    listSaleOrdersMock.mockResolvedValue({
      items: [initialOrder],
      total: 1,
      page: 1,
      limit: 10,
    });

    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await screen.findByText("SO-1");
    await waitFor(() => expect(listSaleOrdersMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      socketHandlers.get("sale-orders.updated")?.({
        updated: 1,
        saleOrderIds: ["order-1"],
        source: "sale-order-imported",
        saleOrders: [updatedOrder],
      });
    });

    await waitFor(() => expect(screen.getByText("Confirmado")).toBeTruthy());
    expect(listSaleOrdersMock).toHaveBeenCalledTimes(1);
  });

  it("inserts new saleOrders from automatic workflow payloads without reloading orders", async () => {
    authState.isAuthenticated = true;
    authState.userId = "user-1";
    const initialOrder = buildSaleOrder("Pendiente");
    const createdOrder = {
      ...buildSaleOrder("Confirmado"),
      id: "order-2",
      correlative: 2,
      currentStateId: "state-Confirmado",
    };
    listSaleOrdersMock.mockResolvedValue({
      items: [initialOrder],
      total: 1,
      page: 1,
      limit: 10,
    });

    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await screen.findByText("SO-1");
    await waitFor(() => expect(listSaleOrdersMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      socketHandlers.get("sale-orders.updated")?.({
        updated: 1,
        saleOrderIds: ["order-2"],
        source: "automatic-workflow",
        trigger: "sale-order-created",
        saleOrders: [createdOrder],
      });
    });

    await waitFor(() => expect(screen.getByText("SO-2")).toBeTruthy());
    expect(listSaleOrdersMock).toHaveBeenCalledTimes(1);
  });

  it("ignores legacy singular saleOrder realtime payloads", async () => {
    authState.isAuthenticated = true;
    authState.userId = "user-1";
    const initialOrder = buildSaleOrder("Pendiente");
    const updatedOrder = buildSaleOrder("Listo para entrega");
    listSaleOrdersMock.mockResolvedValue({
      items: [initialOrder],
      total: 1,
      page: 1,
      limit: 10,
    });
    fetchSaleOrderByIdMock.mockResolvedValue(initialOrder);

    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await user.click(await screen.findByText("SO-1"));
    await waitFor(() => expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0));

    await act(async () => {
      socketHandlers.get("sale-orders.updated")?.({
        updated: 1,
        saleOrderIds: ["order-1"],
        source: "payment-created",
        saleOrder: updatedOrder,
      });
    });

    expect(screen.queryByText("Listo para entrega")).toBeNull();
  });

  it("does not expose payments from row actions", async () => {
    const order = buildSaleOrder("Pendiente");
    order.total = 150;
    order.totalPaid = 50;
    order.pendingAmount = 100;
    listSaleOrdersMock.mockResolvedValue({
      items: [order],
      total: 1,
      page: 1,
      limit: 10,
    });

    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await user.click(await screen.findByRole("button", { name: /acciones del pedido/i }));

    expect(screen.queryByText("Pagos")).not.toBeInTheDocument();
    expect(screen.getByText("Ver PDF")).toBeInTheDocument();
    expect(screen.getByText("Factura")).toBeInTheDocument();
    expect(screen.getByText("Boleta")).toBeInTheDocument();
    expect(fetchSaleOrderByIdMock).not.toHaveBeenCalled();
  });
});
