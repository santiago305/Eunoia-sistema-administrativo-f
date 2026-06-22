import { useEffect, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { createCompanyPaymentAccount } from "@/shared/services/companyPaymentAccountService";
import { CurrencyTypes, type CurrencyType } from "@/features/purchases/types/purchaseEnums";
import type { CompanyPaymentAccountType } from "../types/payment-account.types";

type Props = {
  open: boolean;
  companyId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const typeOptions = [
  { value: "BANK_ACCOUNT", label: "Cuenta bancaria" },
  { value: "CREDIT_CARD", label: "Tarjeta de credito" },
  { value: "CASH", label: "Caja" },
  { value: "DIGITAL_WALLET", label: "Billetera digital" },
];

export function CompanyPaymentAccountFormModal({ open, companyId, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "BANK_ACCOUNT" as CompanyPaymentAccountType,
    name: "",
    bankName: "",
    accountNumber: "",
    cardLastFour: "",
    walletName: "",
    currency: CurrencyTypes.PEN as CurrencyType,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      type: "BANK_ACCOUNT",
      name: "",
      bankName: "",
      accountNumber: "",
      cardLastFour: "",
      walletName: "",
      currency: CurrencyTypes.PEN,
    });
  }, [open]);

  const save = async () => {
    if (saving || !form.name.trim()) return;
    setSaving(true);
    try {
      await createCompanyPaymentAccount({
        companyId,
        type: form.type,
        name: form.name,
        bankName: form.bankName || null,
        accountNumber: form.accountNumber || null,
        cardLastFour: form.cardLastFour || null,
        walletName: form.walletName || null,
        currency: form.currency,
      });
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva cuenta de pago" className="max-w-2xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FloatingSelect
          label="Tipo"
          name="payment-account-type"
          value={form.type}
          options={typeOptions}
          onChange={(value) => setForm((prev) => ({ ...prev, type: value as CompanyPaymentAccountType }))}
        />
        <FloatingInput
          label="Nombre visible"
          name="payment-account-name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <FloatingInput
          label="Banco"
          name="payment-account-bank"
          value={form.bankName}
          onChange={(event) => setForm((prev) => ({ ...prev, bankName: event.target.value }))}
        />
        <FloatingInput
          label="Numero de cuenta"
          name="payment-account-number"
          value={form.accountNumber}
          onChange={(event) => setForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
        />
        <FloatingInput
          label="Ultimos 4 de tarjeta"
          name="payment-account-card"
          maxLength={4}
          value={form.cardLastFour}
          onChange={(event) => setForm((prev) => ({ ...prev, cardLastFour: event.target.value }))}
        />
        <FloatingInput
          label="Billetera"
          name="payment-account-wallet"
          value={form.walletName}
          onChange={(event) => setForm((prev) => ({ ...prev, walletName: event.target.value }))}
        />
        <div className="sm:col-span-2 flex justify-end">
          <SystemButton disabled={saving || !form.name.trim()} onClick={() => void save()}>
            {saving ? "Guardando..." : "Guardar cuenta"}
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}
