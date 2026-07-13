import { useEffect, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import {
  createCompanyPaymentAccount,
  updateCompanyPaymentAccount,
} from "@/shared/services/companyPaymentAccountService";
import { CurrencyTypes, type CurrencyType } from "@/features/purchases/types/purchaseEnums";
import type { CompanyPaymentAccount, CompanyPaymentAccountType } from "../types/payment-account.types";

type Props = {
  open: boolean;
  companyId: string;
  account?: CompanyPaymentAccount | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const typeOptions = [
  { value: "BANK_ACCOUNT", label: "Cuenta bancaria" },
  { value: "CREDIT_CARD", label: "Tarjeta de credito" },
  { value: "CASH", label: "Caja" },
  { value: "DIGITAL_WALLET", label: "Billetera digital" },
];

const currencyOptions = [
  { value: CurrencyTypes.PEN, label: "PEN" },
  { value: CurrencyTypes.USD, label: "USD" },
];

export function CompanyPaymentAccountFormModal({ open, companyId, account, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "BANK_ACCOUNT" as CompanyPaymentAccountType,
    name: "",
    bankName: "",
    accountNumber: "",
    cardLastFour: "",
    walletName: "",
    currency: CurrencyTypes.PEN as CurrencyType,
    isDefault: false,
  });

  useEffect(() => {
    if (!open) return;
    if (account) {
      setForm({
        type: account.type,
        name: account.name ?? "",
        bankName: account.bankName ?? "",
        accountNumber: account.accountNumber ?? "",
        cardLastFour: account.cardLastFour ?? account.accountLastFour ?? "",
        walletName: account.walletName ?? "",
        currency: account.currency,
        isDefault: Boolean(account.isDefault),
      });
      return;
    }

    setForm({
      type: "BANK_ACCOUNT",
      name: "",
      bankName: "",
      accountNumber: "",
      cardLastFour: "",
      walletName: "",
      currency: CurrencyTypes.PEN,
      isDefault: false,
    });
  }, [account, open]);

  const save = async () => {
    if (saving || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        name: form.name.trim(),
        bankName: form.bankName.trim() || null,
        accountNumber: form.accountNumber.trim() || null,
        cardLastFour: form.cardLastFour.trim() || null,
        walletName: form.walletName.trim() || null,
        currency: form.currency,
        isDefault: form.isDefault,
      };

      if (account?.id) {
        await updateCompanyPaymentAccount(account.id, payload);
      } else {
        await createCompanyPaymentAccount({
          companyId,
          ...payload,
        });
      }
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={account ? "Editar cuenta de pago" : "Nueva cuenta de pago"} className="max-w-2xl">
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
        <FloatingSelect
          label="Moneda"
          name="payment-account-currency"
          value={form.currency}
          options={currencyOptions}
          onChange={(value) => setForm((prev) => ({ ...prev, currency: value as CurrencyType }))}
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
        <label className="sm:col-span-2 flex items-center gap-2 rounded-md border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/70">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(event) => setForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
            className="h-4 w-4 accent-primary"
          />
          Usar como cuenta predeterminada para pagos
        </label>
        <div className="sm:col-span-2 flex justify-end">
          <SystemButton disabled={saving || !form.name.trim()} onClick={() => void save()}>
            {saving ? "Guardando..." : account ? "Guardar cambios" : "Guardar cuenta"}
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}
