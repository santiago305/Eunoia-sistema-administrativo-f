import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseDetailsModal } from "./PurchaseDetailsModal";
import { PurchaseOrderStatuses, VoucherDocTypes } from "@/features/purchases/types/purchaseEnums";

const { getByIdMock, uploadPurchaseImageProdutionMock } = vi.hoisted(() => ({
  getByIdMock: vi.fn(),
  uploadPurchaseImageProdutionMock: vi.fn(),
}));

vi.mock("@/shared/services/purchaseService", () => ({
  getById: getByIdMock,
}));

vi.mock("@/features/purchases/utils/purchaseActions", () => ({
  uploadPurchaseImageProdution: uploadPurchaseImageProdutionMock,
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
  DocumentDetailsModal: ({
    extendedDetails,
  }: {
    extendedDetails?: {
      canUploadImage?: boolean;
      images?: string[];
      imageEmptyMessage?: string;
      onUploadImage?: (file?: File | null) => void;
    };
  }) => (
    <div>
      {extendedDetails?.images?.length ? (
        <img src={extendedDetails.images[0]} alt="Imagen de compra 1" />
      ) : (
        <p>{extendedDetails?.imageEmptyMessage}</p>
      )}
      {extendedDetails?.canUploadImage ? (
        <button
          type="button"
          onClick={() => extendedDetails.onUploadImage?.(new File(["image"], "products.png", { type: "image/png" }))}
        >
          Subir foto
        </button>
      ) : null}
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
    uploadPurchaseImageProdutionMock.mockResolvedValue({
      type: "success",
      message: "Foto de productos guardada.",
      imageProdution: ["purchase-attachments/purchase-1/products.webp"],
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

  it("does not allow uploading a purchase photo before the purchase is received", async () => {
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
          status: PurchaseOrderStatuses.DRAFT,
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
          statusLabel: "Borrador",
          docLabel: "Factura",
          numero: "F001-1",
          date: "27/06/2026",
          dateEnter: "27/06/2026",
        }}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(getByIdMock).toHaveBeenCalledWith("purchase-1"));
    expect(screen.queryByRole("button", { name: "Subir foto" })).not.toBeInTheDocument();
  });

  it("keeps the uploaded product photo visible when the immediate refresh is stale", async () => {
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

    await waitFor(() => expect(screen.getByText("Esta compra no tiene foto.")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Subir foto" }));

    expect(await screen.findByAltText("Imagen de compra 1")).toHaveAttribute(
      "src",
      "purchase-attachments/purchase-1/products.webp",
    );
    expect(screen.queryByText("Esta compra no tiene foto.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subir foto" })).not.toBeInTheDocument();
  });
});
