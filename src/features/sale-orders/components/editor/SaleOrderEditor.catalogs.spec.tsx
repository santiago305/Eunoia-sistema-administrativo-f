import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleOrderEditor } from "./SaleOrderEditor";
import type { SaleOrderEditorForm } from "./saleOrderEditorForm";

const {
  getSaleOrderEditorCatalogsMock,
  saveSaleOrderWithClientMock,
  listClientsMock,
  listActiveWarehousesMock,
  listSubsidiariesMock,
  listSourcesMock,
  listWorkflowsMock,
  listAdvisersMock,
  getPaymentMethodsByCompanyMock,
  listCompanyPaymentAccountsByCompanyMock,
} = vi.hoisted(() => ({
  getSaleOrderEditorCatalogsMock: vi.fn(),
  saveSaleOrderWithClientMock: vi.fn(),
  listClientsMock: vi.fn(),
  listActiveWarehousesMock: vi.fn(),
  listSubsidiariesMock: vi.fn(),
  listSourcesMock: vi.fn(),
  listWorkflowsMock: vi.fn(),
  listAdvisersMock: vi.fn(),
  getPaymentMethodsByCompanyMock: vi.fn(),
  listCompanyPaymentAccountsByCompanyMock: vi.fn(),
}));

vi.mock("sileo", () => ({
  sileo: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/shared/hooks/useCompany", () => ({
  useCompany: () => ({ company: { companyId: "company-1" } }),
}));

vi.mock("@/shared/services/saleOrderService", () => ({
  getSaleOrderEditorCatalogs: getSaleOrderEditorCatalogsMock,
  saveSaleOrderWithClient: saveSaleOrderWithClientMock,
}));

vi.mock("@/shared/services/clientService", () => ({
  getClientById: vi.fn(),
  listClients: listClientsMock,
}));

vi.mock("@/shared/services/warehouseServices", () => ({
  listActiveWarehouses: listActiveWarehousesMock,
}));

vi.mock("@/shared/services/agencyService", () => ({
  listSubsidiaries: listSubsidiariesMock,
}));

vi.mock("@/shared/services/sourceService", () => ({
  listSources: listSourcesMock,
}));

vi.mock("@/shared/services/workflowService", () => ({
  listWorkflows: listWorkflowsMock,
}));

vi.mock("@/shared/services/adviserService", () => ({
  listAdvisers: listAdvisersMock,
}));

vi.mock("@/shared/services/paymentMethodService", () => ({
  getPaymentMethodsByCompany: getPaymentMethodsByCompanyMock,
}));

vi.mock("@/shared/services/companyPaymentAccountService", () => ({
  listCompanyPaymentAccountsByCompany: listCompanyPaymentAccountsByCompanyMock,
}));

vi.mock("../modal-create/SaleOrderItemsSection", () => ({
  SaleOrderItemsSection: ({
    form,
  }: {
    form: SaleOrderEditorForm;
  }) => (
    <div data-testid="items-section">
      items:{form.items.length}
    </div>
  ),
}));

vi.mock("./SaleOrderClientSection", () => ({
  SaleOrderClientSection: ({
    clientOptions,
    onSearchClients,
  }: {
    clientOptions: Array<{ label: string }>;
    onSearchClients?: (query: string) => void | Promise<void>;
  }) => (
    <div data-testid="client-section">
      {clientOptions.map((option) => option.label).join(",")}
      <button type="button" onClick={() => void onSearchClients?.("ana")}>
        buscar cliente
      </button>
    </div>
  ),
}));

vi.mock("./SaleOrderInformationSection", () => ({
  SaleOrderInformationSection: ({
    setForm,
    workflowOptions,
    warehouseOptions,
    sourceOptions,
    adviserOptions,
  }: {
    setForm: React.Dispatch<React.SetStateAction<SaleOrderEditorForm>>;
    workflowOptions: Array<{ label: string }>;
    warehouseOptions: Array<{ label: string }>;
    sourceOptions: Array<{ label: string }>;
    adviserOptions: Array<{ name: string }>;
  }) => (
    <div data-testid="information-section">
      {[...workflowOptions, ...warehouseOptions, ...sourceOptions].map((option) => option.label).join(",")}
      {adviserOptions.map((option) => option.name).join(",")}
      <button
        type="button"
        onClick={() => {
          const shippingPhoto = new File(["shipping"], "shipping.webp", {
            type: "image/webp",
          });
          const paymentPhoto = new File(["payment"], "payment.webp", {
            type: "image/webp",
          });
          setForm((current) => ({
            ...current,
            workflowId: "workflow-1",
            warehouseId: "warehouse-1",
            sourceId: "source-1",
            assignedBy: "adviser-1",
            agencyDetail: "Olva Miraflores",
            deliveryCost: 12,
            discount: 2,
            note: "Cliente pide empaque simple",
            advertisingCode: "FB-123",
            observation: "Llamar antes de enviar",
            sendDate: "2026-07-15",
            sendCode: "TRACK-1",
            sendAddress: "Av. 1",
            clientData: {
              ...current.clientData,
              fullName: "Ana Perez",
              docType: "DNI",
              docNumber: "12345678",
              departmentId: "15",
              provinceId: "1501",
              districtId: "150101",
              telephonesReplace: [
                { number: "999999999", isMain: true, isActive: true },
              ],
            },
            items: [
              {
                description: "Pack prueba",
                quantity: 1,
                unitPrice: 50,
                total: 50,
                components: [],
              },
            ],
            payments: [
              {
                clientKey: "payment-1",
                bankAccountId: "account-1",
                method: "EFECTIVO",
                amount: 20,
                date: "2026-07-15",
                operationNumber: "OP-1",
                note: "Adelanto",
                photo: paymentPhoto,
              },
            ],
            shippingPhoto,
          }));
        }}
      >
        preparar pedido valido
      </button>
    </div>
  ),
}));

vi.mock("./SaleOrderShippingSection", () => ({
  SaleOrderShippingSection: ({
    subsidiaryOptions,
    onSearchSubsidiaries,
  }: {
    subsidiaryOptions: Array<{ label: string }>;
    onSearchSubsidiaries?: (query: string) => void | Promise<void>;
  }) => (
    <div data-testid="shipping-section">
      {subsidiaryOptions.map((option) => option.label).join(",")}
      <button type="button" onClick={() => void onSearchSubsidiaries?.("olva")}>
        buscar sucursal
      </button>
    </div>
  ),
}));

vi.mock("./SaleOrderPaymentCards", () => ({
  SaleOrderPaymentCards: ({
    methodOptions = [],
    bankAccountOptions = [],
  }: {
    methodOptions?: Array<{ label: string }>;
    bankAccountOptions?: Array<{ label: string }>;
  }) => (
    <div data-testid="payment-cards">
      {methodOptions.map((option) => option.label).join(",")}
      {bankAccountOptions.map((option) => option.label).join(",")}
    </div>
  ),
}));

const noopCancel = () => undefined;
const noopSaved = () => undefined;

describe("SaleOrderEditor catalog loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSaleOrderEditorCatalogsMock.mockResolvedValue({
      clients: [{ id: "client-initial", fullName: "Cliente Inicial", docNumber: "87654321" }],
      warehouses: [{ warehouseId: "warehouse-1", name: "Principal" }],
      subsidiaries: [{ id: "subsidiary-initial", alias: "Sucursal Inicial", address: "Av. 2", basePrice: 10 }],
      sources: [{ id: "source-1", name: "Facebook" }],
      workflows: [{ id: "workflow-1", name: "Venta", isActive: true }],
      advisers: [{ id: "adviser-1", name: "Ana", email: "ana@example.com" }],
      paymentMethods: [{ companyMethodId: "cm-1", methodId: "method-1", name: "EFECTIVO", isActive: true }],
      companyPaymentAccounts: [
        {
          id: "account-1",
          companyId: "company-1",
          type: "CASH",
          name: "Caja principal",
          currency: "PEN",
          isActive: true,
          isDefault: true,
        },
      ],
    });
    listClientsMock.mockResolvedValue({
      items: [
        {
          id: "client-1",
          fullName: "Cliente Uno",
          docNumber: "12345678",
        },
      ],
      total: 1,
      page: 1,
      limit: 25,
    });
    listSubsidiariesMock.mockResolvedValue([
      {
        id: "subsidiary-1",
        alias: "Olva",
        address: "Av. 1",
        basePrice: 12,
      },
    ]);
  });

  function EditorHarness({
    onSaved = noopSaved,
  }: {
    onSaved?: (saleOrderId: string) => void | Promise<void>;
  }) {
    const [footer, setFooter] = useState<ReactNode | null>(null);

    return (
      <>
        <SaleOrderEditor
          mode="create"
          order={null}
          onCancel={noopCancel}
          onSaved={onSaved}
          onFooterChange={setFooter}
        />
        <div data-testid="editor-footer">{footer}</div>
      </>
    );
  }

  it("loads initial client and subsidiary suggestions, then searches remotely", async () => {
    render(
      <SaleOrderEditor
        mode="create"
        order={null}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await waitFor(() => expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledWith("company-1"));

    expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledTimes(1);
    expect(listClientsMock).not.toHaveBeenCalled();
    expect(listActiveWarehousesMock).not.toHaveBeenCalled();
    expect(listSubsidiariesMock).not.toHaveBeenCalled();
    expect(listSourcesMock).not.toHaveBeenCalled();
    expect(listWorkflowsMock).not.toHaveBeenCalled();
    expect(listAdvisersMock).not.toHaveBeenCalled();
    expect(getPaymentMethodsByCompanyMock).not.toHaveBeenCalled();
    expect(listCompanyPaymentAccountsByCompanyMock).not.toHaveBeenCalled();

    expect(screen.getByTestId("client-section")).toHaveTextContent("Cliente Inicial");
    expect(screen.getByTestId("information-section")).toHaveTextContent("Venta");
    expect(screen.getByTestId("information-section")).toHaveTextContent("Principal");
    expect(screen.getByTestId("information-section")).toHaveTextContent("Facebook");
    expect(screen.getByTestId("information-section")).toHaveTextContent("Ana");
    expect(screen.getByTestId("shipping-section")).toHaveTextContent("Sucursal Inicial");
    expect(screen.getByTestId("payment-cards")).toHaveTextContent("EFECTIVO");
    expect(screen.getByTestId("payment-cards")).toHaveTextContent("Caja principal");

    fireEvent.click(screen.getByRole("button", { name: "buscar cliente" }));

    await waitFor(() =>
      expect(listClientsMock).toHaveBeenCalledWith({
        page: 1,
        limit: 25,
        q: "ana",
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("client-section")).toHaveTextContent("Cliente Uno"),
    );

    fireEvent.click(screen.getByRole("button", { name: "buscar sucursal" }));

    await waitFor(() =>
      expect(listSubsidiariesMock).toHaveBeenCalledWith({
        isActive: true,
        q: "olva",
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("shipping-section")).toHaveTextContent("Olva"),
    );
  });

  it("keeps create save disabled until the minimum required form is complete", async () => {
    render(<EditorHarness />);

    await waitFor(() => expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledWith("company-1"));

    const saveButton = screen.getByRole("button", { name: "Crear pedido" });
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveAttribute("title", "Selecciona el tipo de pedido.");
    expect(saveSaleOrderWithClientMock).not.toHaveBeenCalled();
  });

  it("saves a complete create form with shipping and payment photos", async () => {
    saveSaleOrderWithClientMock.mockResolvedValue({
      orderId: "order-99",
      serie: "SO",
      correlative: 99,
    });
    const onSaved = vi.fn();

    render(<EditorHarness onSaved={onSaved} />);

    await waitFor(() => expect(getSaleOrderEditorCatalogsMock).toHaveBeenCalledWith("company-1"));
    fireEvent.click(screen.getByRole("button", { name: "preparar pedido valido" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Crear pedido" })).not.toBeDisabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Crear pedido" }));

    await waitFor(() => expect(saveSaleOrderWithClientMock).toHaveBeenCalledTimes(1));
    const [payload, files, editingId] = saveSaleOrderWithClientMock.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        workflowId: "workflow-1",
        warehouseId: "warehouse-1",
        sourceId: "source-1",
        agencyDetail: "Olva Miraflores",
        deliveryCost: 12,
        discount: 2,
        advertisingCode: "FB-123",
        sendCode: "TRACK-1",
        client: expect.objectContaining({
          mode: "create",
          data: expect.objectContaining({
            fullName: "Ana Perez",
            docNumber: "12345678",
            departmentId: "15",
            provinceId: "1501",
            districtId: "150101",
          }),
        }),
        items: [
          expect.objectContaining({
            description: "Pack prueba",
            quantity: 1,
            unitPrice: 50,
            total: 50,
          }),
        ],
        payments: [
          expect.objectContaining({
            clientKey: "payment-1",
            bankAccountId: "account-1",
            method: "EFECTIVO",
            amount: 20,
            date: "2026-07-15",
            operationNumber: "OP-1",
          }),
        ],
      }),
    );
    expect(files.shippingPhoto).toBeInstanceOf(File);
    expect(files.shippingPhoto?.name).toBe("shipping.webp");
    expect(files.paymentPhotos).toBeInstanceOf(Map);
    expect(files.paymentPhotos.get("payment-1")?.name).toBe("payment.webp");
    expect(editingId).toBeNull();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("order-99"));
  });
});
