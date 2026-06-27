import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseDetailsModal } from "./PurchaseDetailsModal";
import { PurchaseOrderStatuses, VoucherDocTypes } from "@/features/purchases/types/purchaseEnums";

const { getByIdMock } = vi.hoisted(() => ({
  getByIdMock: vi.fn(),
}));

vi.mock("@/shared/services/purchaseService", () => ({
  getById: getByIdMock,
}));

vi.mock("@/features/purchases/utils/purchaseActions", () => ({
  uploadPurchaseImageProdution: vi.fn(),
}));

vi.mock("@/shared/hooks/useAuth", () => ({
  useAuth: () => ({ userRole: "operador" }),
}));

vi.mock("@/shared/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (permission: string) => permission === "purchases.attach_documents" }),
}));

vi.mock("@/shared/hooks/useFeedbackToast", () => ({
  useFeedbackToast: () => ({ showFeedback: vi.fn() }),
}));

vi.mock("@/shared/components/components/DocumentDetailsModal", () => ({
  DocumentDetailsModal: ({ extendedDetails }: { extendedDetails?: { canUploadImage?: boolean } }) => (
    <div>
      {extendedDetails?.canUploadImage ? <button type="button">Subir foto</button> : null}
    </div>
  ),
}));

describe("PurchaseDetailsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getByIdMock.mockResolvedValue({
      imageProdution: [],
      items: [],
      payments: [],
      quotas: [],
      total: 100,
      totalPaid: 0,
      totalToPay: 100,
      paymentForm: "CONTADO",
    });
  });

  it("allows uploading a missing purchase photo from summary with document permission", async () => {
    render(
      <PurchaseDetailsModal
        open
        poId="purchase-1"
        purchase={{
          poId: "purchase-1",
          supplierId: "supplier-1",
          warehouseId: "warehouse-1",
          documentType: VoucherDocTypes.FACTURA,
          serie: "F001",
          correlative: 1,
          dateIssue: "2026-06-27T10:00:00.000Z",
          dateExpiration: "2026-06-30T10:00:00.000Z",
          expectedAt: "2026-06-27T10:00:00.000Z",
          currency: "PEN",
          status: PurchaseOrderStatuses.RECEIVED,
          purchaseType: "INVENTORY",
          paymentForm: "CONTADO",
          totalTaxed: 100,
          totalExempted: 0,
          totalIgv: 18,
          purchaseValue: 100,
          total: 100,
          totalPaid: 0,
          totalToPay: 100,
          imageProdution: [],
          supplierLabel: "Proveedor",
          supplierDoc: "20123456789",
          warehouseLabel: "Almacen",
          statusLabel: "Recibido",
          docLabel: "Factura",
          numero: "F001-1",
          date: "27/06/2026",
          dateEnter: "27/06/2026",
        }}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(getByIdMock).toHaveBeenCalledWith("purchase-1"));
    expect(screen.getByRole("button", { name: "Subir foto" })).toBeInTheDocument();
  });
});
