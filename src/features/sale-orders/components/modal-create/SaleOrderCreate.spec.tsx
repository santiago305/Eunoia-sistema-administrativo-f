import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SaleOrderCreate from "./SaleOrderCreate";

const { getClientByIdMock, updateClientMock } = vi.hoisted(() => ({
    getClientByIdMock: vi.fn(),
    updateClientMock: vi.fn(),
}));

vi.mock("@/shared/services/clientService", () => ({
    createClient: vi.fn(),
    getClientById: getClientByIdMock,
    listClients: vi.fn().mockResolvedValue({ items: [{ id: "client-1", fullName: "Cliente", docNumber: "123" }] }),
    updateClient: updateClientMock,
}));
vi.mock("@/shared/services/warehouseServices", () => ({ listActiveWarehouses: vi.fn().mockResolvedValue({ items: [] }) }));
vi.mock("@/shared/services/agencyService", () => ({ listSubsidiaries: vi.fn().mockResolvedValue([]) }));
vi.mock("@/shared/services/sourceService", () => ({ listSources: vi.fn().mockResolvedValue({ items: [] }) }));
vi.mock("@/shared/services/workflowService", () => ({ listWorkflows: vi.fn().mockResolvedValue([]) }));
vi.mock("@/shared/services/saleOrderService", () => ({
    createSaleOrder: vi.fn(),
    fetchSaleOrderById: vi.fn(),
    getSaleOrderPdf: vi.fn(),
    updateSaleOrder: vi.fn(),
}));
vi.mock("@/shared/hooks/useCompany", () => ({ useCompany: () => ({ hasCompany: true }) }));
vi.mock("sileo", () => ({ sileo: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/shared/components/components/FloatingSelect", () => ({
    FloatingSelect: ({ label, onChange }: { label: string; onChange: (value: string) => void }) => (label === "Cliente" ? <button onClick={() => onChange("client-1")}>select-client</button> : null),
}));
vi.mock("@/features/sale-orders/components/SaleOrderItemsSection", () => ({ SaleOrderItemsSection: () => null }));
vi.mock("@/features/sale-orders/components/SaleOrderPaymentsModal", () => ({ SaleOrderPaymentsModal: () => null }));
vi.mock("@/shared/components/components/FloatingInput", () => ({ FloatingInput: () => null }));
vi.mock("@/shared/components/components/FloatingSuggestInput", () => ({ FloatingSuggestInput: () => null }));
vi.mock("@/shared/components/components/date-picker/FloatingDatePicker", () => ({ FloatingDatePicker: () => null }));
vi.mock("@/shared/components/modales/ModalOpenPdf", () => ({ PdfViewerModal: () => null }));

vi.mock("@/features/clients/components/ClientFormModal", () => ({
    ClientFormModal: ({ open, mode, client, onSubmit }: any) =>
        open ? (
            <div data-testid="client-modal">
                <span>{mode}</span>
                <span>{client?.fullName ?? "empty"}</span>
                <button
                    onClick={() =>
                        onSubmit({
                            type: "NEW",
                            fullName: " Cliente editado ",
                            docType: "DNI",
                            docNumber: " 87654321 ",
                            departmentId: "dep",
                            provinceId: "prov",
                            districtId: "dist",
                            address: " Dirección ",
                            reference: " Referencia ",
                            isActive: true,
                            telephonesReplace: [{ id: "phone-1", number: " 999999999 ", isMain: true }],
                        })
                    }
                >
                    submit-client
                </button>
            </div>
        ) : null,
}));

describe("SaleOrderCreate client editing", () => {
    beforeEach(() => {
        getClientByIdMock.mockReset();
        updateClientMock.mockReset();
        getClientByIdMock.mockResolvedValue({
            id: "client-1",
            fullName: "Cliente completo",
            type: "NEW",
            docType: "DNI",
            docNumber: "123",
            departmentId: "dep",
            provinceId: "prov",
            districtId: "dist",
            isActive: true,
        });
        updateClientMock.mockResolvedValue({ message: "ok", id: "client-1" });
    });

    it("loads and updates the selected complete client", async () => {
        const user = userEvent.setup();
        render(<SaleOrderCreate inModal />);

        await user.click(screen.getByText("select-client"));
        await user.click(screen.getByTitle("Editar cliente"));

        await waitFor(() => expect(getClientByIdMock).toHaveBeenCalledWith("client-1"));
        expect(screen.getByTestId("client-modal")).toHaveTextContent("edit");
        expect(screen.getByTestId("client-modal")).toHaveTextContent("Cliente completo");

        await user.click(screen.getByText("submit-client"));
        await waitFor(() =>
            expect(updateClientMock).toHaveBeenCalledWith(
                "client-1",
                expect.objectContaining({
                    fullName: "Cliente editado",
                    docNumber: "87654321",
                    telephonesReplace: [{ id: "phone-1", number: "999999999", isMain: true }],
                }),
            ),
        );
    });
});
