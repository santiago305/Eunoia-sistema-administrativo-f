import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SaleOrders from "@/features/sale-orders/SaleOrders";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { ClientType, type SaleOrder, type SaleOrderStatisticsResponse } from "@/features/sale-orders/types/saleOrder";

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
  fetchSaleOrderByIdMock,
  getAvailableSaleOrderTransitionsMock,
  getSaleOrderSearchStateMock,
  getSaleOrderStatisticsMock,
  listSaleOrderPaymentsMock,
  listSaleOrdersMock,
} = vi.hoisted(() => ({
  fetchSaleOrderByIdMock: vi.fn(),
  getAvailableSaleOrderTransitionsMock: vi.fn(),
  getSaleOrderSearchStateMock: vi.fn(),
  getSaleOrderStatisticsMock: vi.fn().mockResolvedValue({
    byWorkflow: [],
    byState: [],
    byClientType: [],
    totals: { orders: 0, total: 0, collected: 0, pending: 0, deliveryCostSum: 0 },
  }),
  listSaleOrderPaymentsMock: vi.fn(),
  listSaleOrdersMock: vi.fn(),
}));

vi.mock("@/shared/services/saleOrderService", async () => {
  const actual = await vi.importActual<typeof import("@/shared/services/saleOrderService")>(
    "@/shared/services/saleOrderService",
  );

  return {
    ...actual,
    fetchSaleOrderById: fetchSaleOrderByIdMock,
    listSaleOrders: listSaleOrdersMock,
    getSaleOrderSearchState: getSaleOrderSearchStateMock,
    getSaleOrderStatistics: getSaleOrderStatisticsMock,
    getAvailableSaleOrderTransitions: getAvailableSaleOrderTransitionsMock,
    listSaleOrderPayments: listSaleOrderPaymentsMock,
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

const buildStatistics = (orders: number, total = orders * 100): SaleOrderStatisticsResponse => ({
  byWorkflow: [{ id: "workflow-1", label: "Flujo venta", count: orders }],
  byState: [{ id: "global-state-1", label: "Pendiente", color: "#64748b", count: orders }],
  byClientType: [{ type: ClientType.NEW, label: "Nuevo", count: orders }],
  byBankAccount: [],
  totals: {
    orders,
    total,
    collected: 0,
    pending: total,
    deliveryCostSum: 0,
  },
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
    listSaleOrdersMock.mockReset();
    getSaleOrderSearchStateMock.mockReset();
    getSaleOrderStatisticsMock.mockReset();
    listSaleOrderPaymentsMock.mockReset();
    listSaleOrdersMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    listSaleOrderPaymentsMock.mockResolvedValue([]);
    getSaleOrderSearchStateMock.mockResolvedValue(emptySearchState);
    getAvailableSaleOrderTransitionsMock.mockResolvedValue([]);
    getSaleOrderStatisticsMock.mockResolvedValue(buildStatistics(0, 0));
  });

  it("shows actions and loads statistics including cancelled orders", async () => {
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: /nuevo pedido/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /flujos/i })).toBeTruthy();

    await waitFor(() =>
      expect(getSaleOrderStatisticsMock).toHaveBeenCalledWith({
        q: undefined,
        filters: [],
        includeCancelled: true,
      }),
    );
  });

  it("keeps pagination inside the order list panel", async () => {
    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    const pagination = await screen.findByRole("navigation", {
      name: "Paginación de pedidos",
    });
    const listPanel = screen.getByRole("complementary", {
      name: "Listado de pedidos",
    });

    expect(listPanel).toContainElement(pagination);
    expect(pagination.parentElement).toHaveClass("shrink-0");
  });

  it("refreshes the selected order detail when sale-orders.updated arrives without explicit ids", async () => {
    authState.isAuthenticated = true;
    authState.userId = "user-1";
    const initialOrder = buildSaleOrder("Pendiente");
    const refreshedOrder = buildSaleOrder("Confirmado");
    listSaleOrdersMock.mockResolvedValue({
      items: [initialOrder],
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
    await waitFor(() => expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0));

    await act(async () => {
      socketHandlers.get("sale-orders.updated")?.({ updated: 1, saleOrderIds: [] });
    });

    await waitFor(() => expect(screen.getByText("Confirmado")).toBeTruthy());
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

    await waitFor(() => expect(screen.getByText("Confirmado")).toBeTruthy());
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

    await waitFor(() => expect(screen.getByText("Entregado")).toBeTruthy());
  });

  it("uses realtime statistics directly when there are no active filters", async () => {
    authState.isAuthenticated = true;
    authState.userId = "user-1";
    const initialOrder = buildSaleOrder("Pendiente");
    listSaleOrdersMock.mockResolvedValue({
      items: [initialOrder],
      total: 1,
      page: 1,
      limit: 10,
    });
    fetchSaleOrderByIdMock.mockResolvedValue(initialOrder);

    render(
      <TooltipProvider>
        <SaleOrders />
      </TooltipProvider>,
    );

    await screen.findByText("SO-1");
    await waitFor(() => expect(getSaleOrderStatisticsMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      socketHandlers.get("sale-orders.updated")?.({
        updated: 1,
        saleOrderIds: ["order-1"],
        source: "payment-created",
        saleOrders: [],
        statistics: buildStatistics(3, 450),
      });
    });

    await waitFor(() => expect(screen.getAllByText("S/ 450.00").length).toBeGreaterThan(0));
    expect(getSaleOrderStatisticsMock).toHaveBeenCalledTimes(1);
  });

  it("uses realtime statistics directly even when filters are active", async () => {
    authState.isAuthenticated = true;
    authState.userId = "user-1";
    const initialOrder = buildSaleOrder("Pendiente");
    listSaleOrdersMock.mockResolvedValue({
      items: [initialOrder],
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

    await user.type(await screen.findByLabelText("Buscar pedido..."), "SO");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() =>
      expect(getSaleOrderStatisticsMock).toHaveBeenLastCalledWith({
        q: "SO",
        filters: [],
        includeCancelled: true,
      }),
    );
    const callsBeforeRealtime = getSaleOrderStatisticsMock.mock.calls.length;

    await act(async () => {
      socketHandlers.get("sale-orders.updated")?.({
        updated: 1,
        saleOrderIds: ["order-1"],
        source: "payment-created",
        saleOrders: [],
        statistics: buildStatistics(99, 9900),
      });
    });

    await waitFor(() => expect(screen.getAllByText("S/ 9,900.00").length).toBeGreaterThan(0));
    expect(getSaleOrderStatisticsMock).toHaveBeenCalledTimes(callsBeforeRealtime);
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

  it("opens payments using the listed order totals without fetching order detail", async () => {
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

    await user.click(await screen.findByRole("button", { name: /acciones/i }));
    await user.click(await screen.findByText("Pagos"));

    await waitFor(() => expect(listSaleOrderPaymentsMock).toHaveBeenCalledWith("order-1"));
    expect(fetchSaleOrderByIdMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/Total: S\/\s*150\.00/)).toBeTruthy();
    expect(screen.getByText(/Pagado: S\/\s*50\.00/)).toBeTruthy();
    expect(screen.getByText(/Pendiente: S\/\s*100\.00/)).toBeTruthy();
  });
});
