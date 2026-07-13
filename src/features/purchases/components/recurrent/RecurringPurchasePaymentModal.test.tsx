import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CurrencyTypes } from "../../types/purchaseEnums";
import type { RecurringPurchase } from "../../types/recurring-purchase.types";
import { RecurringPurchasePaymentModal } from "./RecurringPurchasePaymentModal";

const { registerPaymentMock, uploadAttachmentMock, getAllPaymentMethodsMock } = vi.hoisted(() => ({
  registerPaymentMock: vi.fn(),
  uploadAttachmentMock: vi.fn(),
  getAllPaymentMethodsMock: vi.fn(),
}));

const floatingSelectMock = vi.hoisted(() => vi.fn());
const floatingInputMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/services/recurringPurchaseService", () => ({
  registerRecurringPurchasePayment: registerPaymentMock,
}));

vi.mock("@/shared/services/purchaseAttachmentService", () => ({
  uploadPurchaseAttachment: uploadAttachmentMock,
}));

vi.mock("@/shared/services/paymentMethodService", () => ({
  getAllPaymentMethods: getAllPaymentMethodsMock,
}));

vi.mock("@/shared/components/modales/Modal", () => ({
  Modal: ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) =>
    open ? (
      <section>
        <h1>{title}</h1>
        {children}
      </section>
    ) : null,
}));

vi.mock("@/shared/components/components/FloatingSelect", () => ({
  FloatingSelect: (props: {
    label: string;
    name: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
  }) => {
    floatingSelectMock(props);
    return (
      <select
        aria-label={props.label}
        name={props.name}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  },
}));

vi.mock("@/shared/components/components/FloatingInput", () => ({
  FloatingInput: (props: {
    label: string;
    name: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => {
    floatingInputMock(props);
    return (
      <input
        aria-label={props.label}
        name={props.name}
        value={props.value}
        onChange={props.onChange}
      />
    );
  },
}));

const item: RecurringPurchase = {
  recurringPurchaseTemplateId: "rec-1",
  supplierId: "supplier-1",
  name: "Hosting mensual",
  frequency: "MONTHLY",
  purchaseType: "SUBSCRIPTION",
  currency: CurrencyTypes.PEN,
  amount: 120,
  startDate: "2026-06-10",
  nextDueDate: "2026-07-10",
  status: "ACTIVE",
  reminderDaysBefore: [7, 3, 1, 0],
};

describe("RecurringPurchasePaymentModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllPaymentMethodsMock.mockResolvedValue([{ name: "TRANSFERENCIA" }]);
    registerPaymentMock.mockResolvedValue({
      type: "success",
      paymentId: "payment-1",
      purchaseId: "purchase-1",
      accountPayableId: "payable-1",
    });
    uploadAttachmentMock.mockResolvedValue({ type: "success" });
  });

  it("registers a recurring payment and uploads evidence", async () => {
    const onSaved = vi.fn();
    render(
      <RecurringPurchasePaymentModal
        open
        item={item}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    await screen.findByText("Registrar pago recurrente");
    fireEvent.change(screen.getByLabelText("Operación"), { target: { value: "OP-123" } });
    fireEvent.change(screen.getByLabelText("Comprobante"), {
      target: { files: [new File(["voucher"], "voucher.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(registerPaymentMock).toHaveBeenCalledWith("rec-1", {
        method: "TRANSFERENCIA",
        date: expect.any(String),
        currency: CurrencyTypes.PEN,
        amount: 120,
        operationNumber: "OP-123",
        note: undefined,
      }),
    );
    expect(uploadAttachmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaseId: "purchase-1",
        paymentId: "payment-1",
        type: "PAYMENT_PROOF",
        file: expect.any(File),
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("uses shared floating controls for method and operation fields", async () => {
    render(
      <RecurringPurchasePaymentModal
        open
        item={item}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await screen.findByText("Registrar pago recurrente");

    await waitFor(() => {
      expect(floatingSelectMock).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "Método",
          name: "method",
          options: [{ value: "TRANSFERENCIA", label: "TRANSFERENCIA", requiresVoucher: undefined }],
        }),
      );
    });
    expect(floatingInputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Operación",
        name: "operationNumber",
      }),
    );
  });

  it("does not show or upload evidence when the user cannot upload payment evidence", async () => {
    const onSaved = vi.fn();
    render(
      <RecurringPurchasePaymentModal
        open
        item={item}
        onClose={vi.fn()}
        onSaved={onSaved}
        canUploadEvidence={false}
      />,
    );

    await screen.findByText("Registrar pago recurrente");
    expect(screen.queryByLabelText("Comprobante")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Método")).toHaveValue("TRANSFERENCIA"));

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(registerPaymentMock).toHaveBeenCalledWith(
        "rec-1",
        expect.objectContaining({
          date: expect.any(String),
          currency: CurrencyTypes.PEN,
          amount: 120,
          operationNumber: undefined,
          note: undefined,
        }),
      ),
    );
    expect(uploadAttachmentMock).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it("renders the recurring payment amount as Peruvian money", async () => {
    render(
      <RecurringPurchasePaymentModal
        open
        item={item}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await screen.findByText("Registrar pago recurrente");

    expect(screen.getByText("S/")).toBeInTheDocument();
    expect(screen.getByLabelText("Monto")).toHaveValue(120);
  });

  it("does not show or upload evidence for cash payments", async () => {
    getAllPaymentMethodsMock.mockResolvedValue([{ name: "EFECTIVO", requiresVoucher: false }]);
    const onSaved = vi.fn();

    render(
      <RecurringPurchasePaymentModal
        open
        item={item}
        onClose={vi.fn()}
        onSaved={onSaved}
        canUploadEvidence
      />,
    );

    await waitFor(() => expect(screen.getByLabelText("Método")).toHaveValue("EFECTIVO"));
    expect(screen.queryByLabelText("Comprobante")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(registerPaymentMock).toHaveBeenCalledWith(
        "rec-1",
        expect.objectContaining({
          method: "EFECTIVO",
          amount: 120,
        }),
      ),
    );
    expect(uploadAttachmentMock).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });
});
