import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { sileo } from "sileo";
import { env } from "@/env";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { OperationImageGallery } from "@/shared/components/components/OperationImageGallery";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingDatePicker } from "@/shared/components/components/date-picker/FloatingDatePicker";
import { Modal } from "@/shared/components/modales/Modal";
import {
  parseDateInputValue,
  toLocalDateKey,
} from "@/shared/utils/functionPurchases";
import {
  useSaleOrderPaymentOptions,
  filterSaleOrderBankAccountOptions,
  type SaleOrderPaymentSelectOption,
} from "../useSaleOrderPaymentOptions";
import type {
  SaleOrderEditorForm,
  SaleOrderEditorPayment,
} from "./saleOrderEditorForm";
import {
  calculateSaleOrderTotals,
  markAttachmentRemoved,
} from "./saleOrderEditorForm";
import { SaleOrderEditorSection } from "./SaleOrderEditorSection";
import { PaymentDescription } from "../../types/saleOrder";

type Props = {
  form: SaleOrderEditorForm;
  setForm: React.Dispatch<React.SetStateAction<SaleOrderEditorForm>>;
  methodOptions?: SaleOrderPaymentSelectOption[];
  bankAccountOptions?: SaleOrderPaymentSelectOption[];
};

type PaymentModalState = {
  mode: "create" | "edit";
  index: number | null;
  draft: SaleOrderEditorPayment;
};

const nextClientKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const resolveUrl = (value?: string | null) => {
  if (!value) return "";
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  try {
    return new URL(value, env.apiBaseUrl).toString();
  } catch {
    return value;
  }
};

export function SaleOrderPaymentCards({
  form,
  setForm,
  methodOptions: providedMethodOptions,
  bankAccountOptions: providedBankAccountOptions,
}: Props) {
  const [isOtherDescription, setIsOtherDescription] = useState(false);
  const shouldLoadPaymentOptions =
    providedMethodOptions === undefined || providedBankAccountOptions === undefined;
  const fallbackOptions = useSaleOrderPaymentOptions({
    enabled: shouldLoadPaymentOptions,
  });
  const methodOptions = providedMethodOptions ?? fallbackOptions.methodOptions;
  const bankAccountOptions =
    providedBankAccountOptions ?? fallbackOptions.bankAccountOptions;

  const descriptionOptions = [
    {
      value: PaymentDescription.ANTICIPO,
      label: PaymentDescription.ANTICIPO,
    },
    {
      value: PaymentDescription.SALDO,
      label: PaymentDescription.SALDO,
    },
    {
      value: PaymentDescription.OTROS,
      label: PaymentDescription.OTROS,
    },
  ]; 
  const [modalState, setModalState] = useState<PaymentModalState | null>(null);
  const [draftPhotoUrl, setDraftPhotoUrl] = useState("");
  const money = useMemo(
    () =>
      new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
      }),
    [],
  );

  useEffect(() => {
    const photo = modalState?.draft.photo;
    if (photo) {
      const objectUrl = URL.createObjectURL(photo);
      setDraftPhotoUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setDraftPhotoUrl(resolveUrl(modalState?.draft.existingPhotoUrl));
    return undefined;
  }, [modalState?.draft.existingPhotoUrl, modalState?.draft.photo]);

  const openCreatePayment = () => {
    const total = calculateSaleOrderTotals(
      form.items,
      form.deliveryCost,
      form.discount,
      form.discountType,
    ).total;
    const paid = form.payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );
    const pending = Math.max(0, Number((total - paid).toFixed(2)));

    setModalState({
      mode: "create",
      index: null,
      draft: {
        clientKey: nextClientKey(),
        method: "",
        paymentMethodId: null,
        companyPaymentAccountId: null,
        amount: pending,
        date: toLocalDateKey(new Date()),
        photo: null,
      },
    });
  };

  const openEditPayment = (payment: SaleOrderEditorPayment, index: number) => {
    setModalState({
      mode: "edit",
      index,
      draft: { ...payment },
    });
  };

  const updateDraft = (patch: Partial<SaleOrderEditorPayment>) =>
    setModalState((current) =>
      current
        ? { ...current, draft: { ...current.draft, ...patch } }
        : current,
    );

  const availableForDraft = useMemo(() => {
    if (!modalState) return 0;
    const total = calculateSaleOrderTotals(
      form.items,
      form.deliveryCost,
      form.discount,
      form.discountType,
    ).total;
    const paidByOtherPayments = form.payments.reduce(
      (sum, payment, index) =>
        modalState.mode === "edit" && index === modalState.index
          ? sum
          : sum + Number(payment.amount || 0),
      0,
    );
    return Math.max(0, Number((total - paidByOtherPayments).toFixed(2)));
  }, [form, modalState]);

  const amountError =
    modalState && Number(modalState.draft.amount || 0) > availableForDraft + 0.01
      ? `El monto no puede superar el saldo disponible de ${money.format(availableForDraft)}.`
      : undefined;

  const compatibleBankAccountOptions = useMemo(() => {
    if (!modalState) return bankAccountOptions;
    const method = methodOptions.find(
      (option) => option.value === (modalState.draft.paymentMethodId ?? modalState.draft.method),
    );
    return filterSaleOrderBankAccountOptions(bankAccountOptions, method?.paymentMethodCode);
  }, [bankAccountOptions, methodOptions, modalState]);

  const saveDraft = () => {
    if (!modalState) return;
    if (
      !modalState.draft.amount ||
      !modalState.draft.method ||
      !modalState.draft.date ||
      !modalState.draft.companyPaymentAccountId && !modalState.draft.bankAccountId
    ) {
      sileo.error({
        title: "Completa monto, metodo, fecha y cuenta para guardar el pago.",
      });
      return;
    }
    if (amountError) {
      sileo.error({ title: amountError });
      return;
    }
    setForm((current) => {
      if (modalState.mode === "edit" && modalState.index !== null) {
        return {
          ...current,
          payments: current.payments.map((payment, index) =>
            index === modalState.index ? modalState.draft : payment,
          ),
        };
      }
      return {
        ...current,
        payments: [...current.payments, modalState.draft],
      };
    });
    setModalState(null);
  };

  const removePayment = (payment: SaleOrderEditorPayment, index: number) =>
    setForm((current) => {
      const next = markAttachmentRemoved(
        current,
        payment.existingAttachmentId,
      );
      return {
        ...next,
        payments: next.payments.filter((_, itemIndex) => itemIndex !== index),
      };
    });

  return (
    <SaleOrderEditorSection
      title="Pagos"
      actions={
        <SystemButton
          type="button"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openCreatePayment}
        >
          Agregar Pago
        </SystemButton>
      }
    >
      <div className="scroll-area max-h-40 space-y-3 overflow-y-auto overflow-x-hidden">
        {form.payments.map((payment, index) => (
          <div
            key={payment.clientKey}
            className="flex items-center gap-2 rounded-lg bg-background/80 p-2 shadow-sm"
          >
            <button
              type="button"
              className="flex min-h-12 flex-1 items-center justify-between gap-3 rounded-md px-2 text-left transition-colors hover:bg-muted/60"
              aria-label={`${payment.date || "Sin fecha"} ${money.format(Number(payment.amount || 0))}`}
              onClick={() => openEditPayment(payment, index)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">
                    {payment.date || "Sin fecha"}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    Pago {index + 1}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {money.format(Number(payment.amount || 0))}
              </span>
            </button>
            <SystemButton
              type="button"
              size="sm"
              variant="ghost"
              className="text-rose-600 hover:bg-rose-500/10"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => removePayment(payment, index)}
            >
              Quitar
            </SystemButton>
          </div>
        ))}
        {!form.payments.length ? (
          <p className="py-3 text-center text-xs text-muted-foreground">
            No hay pagos registrados.
          </p>
        ) : null}
      </div>

      <Modal
        open={Boolean(modalState)}
        onClose={() => setModalState(null)}
        title={modalState?.mode === "edit" ? "Detalle de pago" : "Agregar pago"}
        className="w-full max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <SystemButton
              type="button"
              variant="outline"
              onClick={() => setModalState(null)}
            >
              Cancelar
            </SystemButton>
            <SystemButton type="button" onClick={saveDraft}>
              Guardar pago
            </SystemButton>
          </div>
        }
      >
        {modalState ? (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="grid gap-3 sm:grid-cols-2">
              <FloatingInput
                label="Monto"
                name={`payment-amount-${modalState.draft.clientKey}`}
                type="number"
                min={0}
                max={availableForDraft}
                step="0.01"
                value={String(modalState.draft.amount)}
                error={amountError}
                requiredIndicator
                onChange={(event) =>
                  updateDraft({
                    amount: Math.max(0, Number(event.target.value || 0)),
                  })
                }
              />
              <FloatingDatePicker
                label="Fecha"
                name={`payment-date-${modalState.draft.clientKey}`}
                value={parseDateInputValue(modalState.draft.date)}
                requiredIndicator
                onChange={(date) =>
                  updateDraft({
                    date: date ? toLocalDateKey(date) : "",
                  })
                }
              />
              <FloatingSelect
                label="Método de cobro"
                name={`payment-method-${modalState.draft.clientKey}`}
                value={modalState.draft.paymentMethodId ?? modalState.draft.method}
                options={methodOptions}
                requiredIndicator
                onChange={(paymentMethodId) => {
                  const selected = methodOptions.find((option) => option.value === paymentMethodId);
                  const selectedAccountId = modalState.draft.companyPaymentAccountId ?? modalState.draft.bankAccountId;
                  const keepAccount = !selectedAccountId || filterSaleOrderBankAccountOptions(
                    bankAccountOptions,
                    selected?.paymentMethodCode,
                  ).some((option) => option.value === selectedAccountId);
                  updateDraft({
                    paymentMethodId,
                    method: selected?.label ?? paymentMethodId,
                    ...(keepAccount ? {} : { companyPaymentAccountId: null, bankAccountId: null }),
                  });
                }}
              />
              <FloatingSelect
                label="Cuenta receptora"
                name={`payment-account-${modalState.draft.clientKey}`}
                value={modalState.draft.companyPaymentAccountId ?? modalState.draft.bankAccountId ?? ""}
                options={compatibleBankAccountOptions}
                requiredIndicator
                onChange={(companyPaymentAccountId) =>
                  updateDraft({ companyPaymentAccountId: companyPaymentAccountId || null, bankAccountId: companyPaymentAccountId || null })
                }
              />
              <FloatingInput
                label="Operacion"
                name={`payment-operation-${modalState.draft.clientKey}`}
                value={modalState.draft.operationNumber ?? ""}
                onChange={(event) =>
                  updateDraft({ operationNumber: event.target.value })
                }
              />
              {!isOtherDescription ? (
                <FloatingSelect
                  label="Descripción"
                  name={`payment-description-${modalState.draft.clientKey}`}
                  value={modalState.draft.note ?? ""}
                  options={descriptionOptions}
                  onChange={(note) => {
                    if (note === PaymentDescription.OTROS) {
                      setIsOtherDescription(true);
                      updateDraft({ note: "" });
                      return;
                    }
                    updateDraft({ note: note || null });
                  }}
                />
              ) : (
                <FloatingInput
                  label="Descripción"
                  name={`payment-note-${modalState.draft.clientKey}`}
                  value={modalState.draft.note ?? ""}
                  onChange={(event) =>
                    updateDraft({ note: event.target.value })
                  }
                />
              )}
            </div>
            <OperationImageGallery
              images={draftPhotoUrl ? [draftPhotoUrl] : []}
              altPrefix="Comprobante de pago"
              emptyMessage="No hay comprobante."
              canUpload
              onUpload={(file) => updateDraft({ photo: file ?? null })}
            />
          </div>
        ) : null}
      </Modal>
    </SaleOrderEditorSection>
  );
}
