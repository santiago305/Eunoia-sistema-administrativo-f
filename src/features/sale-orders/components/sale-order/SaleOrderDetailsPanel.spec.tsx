import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleOrderDetailsPanel } from "./SaleOrderDetailsPanel";
import { ClientType, type SaleOrder } from "@/features/sale-orders/types/saleOrder";

const { getClientByIdMock, updateClientMock, getAvailableSaleOrderTransitionsMock } = vi.hoisted(() => ({
  getClientByIdMock: vi.fn(),
  updateClientMock: vi.fn(),
  getAvailableSaleOrderTransitionsMock: vi.fn(),
}));

vi.mock("@/shared/services/clientService", () => ({
  getClientById: getClientByIdMock,
  updateClient: updateClientMock,
}));

vi.mock("@/shared/services/saleOrderService", () => ({
  changeSaleOrderState: vi.fn(),
  getAvailableSaleOrderTransitions: getAvailableSaleOrderTransitionsMock,
}));

vi.mock("@/features/clients/components/ClientFormModal", () => ({
  ClientFormModal: ({
    open,
    client,
    loading,
    onSubmit,
  }: {
    open: boolean;
    client?: { fullName?: string } | null;
    loading?: boolean;
    onSubmit: (form: {
      type: "NEW";
      fullName: string;
      docType: "DNI";
      docNumber: string;
      departmentId: string;
      provinceId: string;
      districtId: string;
      address: string;
      reference: string;
      isActive: boolean;
      telephonesReplace?: Array<{ id?: string; number?: string; isMain?: boolean }>;
    }) => void;
  }) =>
    open ? (
      <div data-testid="client-form-modal">
        <span>{loading ? "loading" : "ready"}</span>
        <span>{client?.fullName ?? "no-client"}</span>
        <button
          type="button"
          onClick={() =>
            onSubmit({
              type: "NEW",
              fullName: " Cliente actualizado ",
              docType: "DNI",
              docNumber: " 87654321 ",
              departmentId: "dep-1",
              provinceId: "prov-1",
              districtId: "dist-1",
              address: " Direccion nueva ",
              reference: " Referencia nueva ",
              isActive: true,
              telephonesReplace: [{ id: "phone-1", number: " 988888888 ", isMain: true }],
            })
          }
        >
          submit-client
        </button>
      </div>
    ) : null,
}));

vi.mock("@/features/sale-orders/components/SaleOrderItemComponentsStockModal", () => ({
  SaleOrderItemComponentsStockModal: () => null,
}));

vi.mock("./SaleOrderWorkflowHistoryModal", () => ({
  SaleOrderWorkflowHistoryModal: () => null,
}));

const buildOrder = (): SaleOrder => ({
  id: "order-1",
  serie: "SO",
  correlative: 1,
  client: {
    id: "client-1",
    type: ClientType.NEW,
    docType: "DNI",
    fullName: "Cliente resumen",
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
  currentStateId: "state-1",
  workflow: { id: "workflow-1", name: "Flujo venta", description: null, isActive: true },
  currentState: {
    id: "state-1",
    name: "Pendiente",
    code: "PENDING",
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

describe("SaleOrderDetailsPanel", () => {
  beforeEach(() => {
    getClientByIdMock.mockReset();
    updateClientMock.mockReset();
    getAvailableSaleOrderTransitionsMock.mockReset();
    getAvailableSaleOrderTransitionsMock.mockResolvedValue([]);
  });

  it("does not load action transitions in modal detail mode", async () => {
    render(
      <SaleOrderDetailsPanel
        order={buildOrder()}
        showActions={false}
        onEdit={vi.fn()}
        onOpenPdf={vi.fn()}
        onOpenPayments={vi.fn()}
        onOrderChanged={vi.fn()}
      />,
    );

    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(getAvailableSaleOrderTransitionsMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Acciones del pedido" })).not.toBeInTheDocument();
  });

  it("loads the complete client before opening the edit modal", async () => {
    getClientByIdMock.mockResolvedValue({
      id: "client-1",
      type: "NEW",
      fullName: "Cliente completo",
      docType: "DNI",
      docNumber: "12345678",
      departmentId: "dep-1",
      provinceId: "prov-1",
      districtId: "dist-1",
      address: "Direccion",
      reference: "Referencia",
      isActive: true,
      telephones: [],
      createdAt: "2026-06-15T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z",
    });

    const user = userEvent.setup();

    render(
      <SaleOrderDetailsPanel
        order={buildOrder()}
        onEdit={vi.fn()}
        onOpenPdf={vi.fn()}
        onOpenPayments={vi.fn()}
        onOrderChanged={vi.fn()}
      />,
    );

    const [, editClientButton] = screen.getAllByRole("button");
    await user.click(editClientButton);

    await waitFor(() => expect(getClientByIdMock).toHaveBeenCalledWith("client-1"));
    expect(screen.getByTestId("client-form-modal")).toHaveTextContent("Cliente completo");
  });

  it("sends telephonesReplace when updating the client from the sale order detail", async () => {
    getClientByIdMock.mockResolvedValue({
      id: "client-1",
      type: "NEW",
      fullName: "Cliente completo",
      docType: "DNI",
      docNumber: "12345678",
      departmentId: "dep-1",
      provinceId: "prov-1",
      districtId: "dist-1",
      address: "Direccion",
      reference: "Referencia",
      isActive: true,
      telephones: [],
      createdAt: "2026-06-15T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z",
    });
    updateClientMock.mockResolvedValue({ message: "ok" });
    const onOrderChanged = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <SaleOrderDetailsPanel
        order={buildOrder()}
        onEdit={vi.fn()}
        onOpenPdf={vi.fn()}
        onOpenPayments={vi.fn()}
        onOrderChanged={onOrderChanged}
      />,
    );

    const [, editClientButton] = screen.getAllByRole("button");
    await user.click(editClientButton);
    await screen.findByText("Cliente completo");

    await user.click(screen.getByRole("button", { name: "submit-client" }));

    await waitFor(() =>
      expect(updateClientMock).toHaveBeenCalledWith(
        "client-1",
        expect.objectContaining({
          telephonesReplace: [{ id: "phone-1", number: "988888888", isMain: true }],
        }),
      ),
    );
    expect(updateClientMock.mock.calls[0]?.[1]).not.toHaveProperty("telephonesPatch");
  });
});
