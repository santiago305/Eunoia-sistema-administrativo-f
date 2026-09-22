import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { SystemButton } from "@/shared/components/components/SystemButton";
import {
  createCompanyPaymentAccount,
  updateCompanyPaymentAccount,
} from "@/shared/services/companyPaymentAccountService";
import { CurrencyTypes, type CurrencyType } from "@/features/purchases/types/purchaseEnums";
import type {
  CompanyPaymentAccount,
  CompanyPaymentAccountType,
  CompanyPaymentAccountUsage,
  CreateCompanyPaymentAccountDto,
} from "../types/payment-account.types";

type Props = {
  open: boolean;
  companyId: string;
  account?: CompanyPaymentAccount | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

type FormState = {
  type: CompanyPaymentAccountType;
  usage: CompanyPaymentAccountUsage;
  name: string;
  institutionName: string;
  accountNumber: string;
  cci: string;
  cardLastFour: string;
  walletProvider: string;
  walletPhone: string;
  holderName: string;
  currency: CurrencyType;
  isDefault: boolean;
};

const EMPTY_FORM: FormState = {
  type: "BANK_ACCOUNT",
  usage: "BOTH",
  name: "",
  institutionName: "",
  accountNumber: "",
  cci: "",
  cardLastFour: "",
  walletProvider: "",
  walletPhone: "",
  holderName: "",
  currency: CurrencyTypes.PEN,
  isDefault: false,
};

const typeOptions = [
  { value: "BANK_ACCOUNT", label: "Cuenta bancaria" },
  { value: "CREDIT_CARD", label: "Tarjeta de crédito" },
  { value: "CASH", label: "Caja" },
  { value: "DIGITAL_WALLET", label: "Billetera digital" },
];
const usageOptions = [
  { value: "OUTFLOW", label: "Solo salidas" },
  { value: "INFLOW", label: "Solo ingresos" },
  { value: "BOTH", label: "Ingresos y salidas" },
];
const currencyOptions = [
  { value: CurrencyTypes.PEN, label: "PEN" },
  { value: CurrencyTypes.USD, label: "USD" },
];

const errorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === "string") return response.data.message;
    if (Array.isArray(response?.data?.message)) return response.data.message.join(". ");
  }
  return "No se pudo guardar la cuenta.";
};

export function CompanyPaymentAccountFormModal({ open, companyId, account, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTouched({});
    setSubmitError(null);
    setForm(account ? {
      type: account.type,
      usage: account.usage ?? "BOTH",
      name: account.name ?? "",
      institutionName: account.institutionName ?? account.bankName ?? "",
      accountNumber: account.accountNumber ?? "",
      cci: account.cci ?? "",
      cardLastFour: account.cardLastFour ?? "",
      walletProvider: account.walletProvider ?? account.walletName ?? "",
      walletPhone: account.walletPhone ?? "",
      holderName: account.holderName ?? "",
      currency: account.currency,
      isDefault: Boolean(account.isDefault),
    } : EMPTY_FORM);
  }, [account, open]);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    const hasStoredBankIdentifier = account?.type === "BANK_ACCOUNT" && Boolean(account.accountLastFour || account.cciLastFour);
    const hasStoredWalletIdentifier = account?.type === "DIGITAL_WALLET" && Boolean(account.walletPhoneLastFour);
    if (!form.name.trim()) next.name = "Ingresa un nombre visible.";
    if (form.type === "BANK_ACCOUNT") {
      if (!form.institutionName.trim()) next.institutionName = "Indica la institución financiera.";
      if (!form.accountNumber.trim() && !form.cci.trim() && !hasStoredBankIdentifier) {
        next.accountNumber = "Ingresa el número de cuenta o el CCI.";
      }
      if (form.cci && !/^\d{20}$/.test(form.cci)) next.cci = "El CCI debe tener 20 dígitos.";
    }
    if (form.type === "CREDIT_CARD" && !/^\d{4}$/.test(form.cardLastFour)) {
      next.cardLastFour = "Ingresa exactamente cuatro dígitos.";
    }
    if (form.type === "DIGITAL_WALLET") {
      if (!form.walletProvider.trim()) next.walletProvider = "Indica el proveedor de la billetera.";
      if (!form.walletPhone && !hasStoredWalletIdentifier) next.walletPhone = "Ingresa el identificador de la billetera.";
      if (form.walletPhone && !/^\d{6,15}$/.test(form.walletPhone)) {
        next.walletPhone = "Usa entre 6 y 15 dígitos.";
      }
    }
    return next;
  }, [account, form]);

  const markTouched = (field: string) => setTouched((current) => ({ ...current, [field]: true }));
  const fieldError = (field: string) => touched[field] ? errors[field] : undefined;

  const changeType = (type: CompanyPaymentAccountType) => {
    setForm((current) => ({
      ...current,
      type,
      usage: type === "CREDIT_CARD" && current.usage === "BOTH" ? "OUTFLOW" : current.usage,
      institutionName: type === "BANK_ACCOUNT" || type === "CREDIT_CARD" ? current.institutionName : "",
      accountNumber: type === "BANK_ACCOUNT" ? current.accountNumber : "",
      cci: type === "BANK_ACCOUNT" ? current.cci : "",
      cardLastFour: type === "CREDIT_CARD" ? current.cardLastFour : "",
      walletProvider: type === "DIGITAL_WALLET" ? current.walletProvider : "",
      walletPhone: type === "DIGITAL_WALLET" ? current.walletPhone : "",
      holderName: type === "BANK_ACCOUNT" || type === "CREDIT_CARD" ? current.holderName : "",
    }));
    setTouched({});
  };

  const save = async () => {
    if (saving) return;
    if (Object.keys(errors).length > 0) {
      setTouched(Object.fromEntries(Object.keys(errors).map((field) => [field, true])));
      setSubmitError("Revisa los campos señalados antes de guardar.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      const payload: Omit<CreateCompanyPaymentAccountDto, "companyId"> = {
        type: form.type,
        usage: form.usage,
        name: form.name.trim(),
        currency: form.currency,
        isDefault: form.isDefault,
        institutionName: form.type === "BANK_ACCOUNT" || form.type === "CREDIT_CARD"
          ? form.institutionName.trim() || null
          : null,
        cardLastFour: form.type === "CREDIT_CARD" ? form.cardLastFour : null,
        walletProvider: form.type === "DIGITAL_WALLET" ? form.walletProvider.trim() || null : null,
        holderName: form.type === "BANK_ACCOUNT" || form.type === "CREDIT_CARD"
          ? form.holderName.trim() || null
          : null,
        ...(form.accountNumber.trim() ? { accountNumber: form.accountNumber.trim() } : {}),
        ...(form.cci.trim() ? { cci: form.cci.trim() } : {}),
        ...(form.walletPhone.trim() ? { walletPhone: form.walletPhone.trim() } : {}),
      };

      if (account?.id) await updateCompanyPaymentAccount(account.id, payload);
      else await createCompanyPaymentAccount({ companyId, ...payload });
      await onSaved();
      onClose();
    } catch (error) {
      setSubmitError(errorMessage(error));
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={account ? "Editar cuenta" : "Nueva cuenta"} className="max-w-2xl">
      <div className="space-y-4">
        {submitError ? (
          <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 outline-none">
            {submitError}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FloatingSelect label="Tipo" name="payment-account-type" value={form.type} options={typeOptions} onChange={(value) => changeType(value as CompanyPaymentAccountType)} requiredIndicator />
          <FloatingSelect label="Uso" name="payment-account-usage" value={form.usage} options={usageOptions} onChange={(value) => setForm((current) => ({ ...current, usage: value as CompanyPaymentAccountUsage }))} requiredIndicator />
          <FloatingInput label="Nombre visible" name="payment-account-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} onBlur={() => markTouched("name")} error={fieldError("name")} requiredIndicator />
          <FloatingSelect label="Moneda" name="payment-account-currency" value={form.currency} options={currencyOptions} onChange={(value) => setForm((current) => ({ ...current, currency: value as CurrencyType }))} requiredIndicator />

          {form.type === "BANK_ACCOUNT" || form.type === "CREDIT_CARD" ? (
            <FloatingInput label="Institución financiera" name="payment-account-institution" value={form.institutionName} onChange={(event) => setForm((current) => ({ ...current, institutionName: event.target.value }))} onBlur={() => markTouched("institutionName")} error={fieldError("institutionName")} requiredIndicator={form.type === "BANK_ACCOUNT"} />
          ) : null}
          {form.type === "BANK_ACCOUNT" ? (
            <>
              <FloatingInput label="Número de cuenta" name="payment-account-number" value={form.accountNumber} onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))} onBlur={() => markTouched("accountNumber")} error={fieldError("accountNumber")} autoComplete="off" />
              <FloatingInput label="CCI (20 dígitos)" name="payment-account-cci" value={form.cci} maxLength={20} inputMode="numeric" onChange={(event) => setForm((current) => ({ ...current, cci: event.target.value.replace(/\D/g, "") }))} onBlur={() => markTouched("cci")} error={fieldError("cci")} autoComplete="off" />
            </>
          ) : null}
          {form.type === "CREDIT_CARD" ? (
            <FloatingInput label="Últimos 4 de tarjeta" name="payment-account-card" value={form.cardLastFour} maxLength={4} inputMode="numeric" onChange={(event) => setForm((current) => ({ ...current, cardLastFour: event.target.value.replace(/\D/g, "") }))} onBlur={() => markTouched("cardLastFour")} error={fieldError("cardLastFour")} requiredIndicator />
          ) : null}
          {form.type === "DIGITAL_WALLET" ? (
            <>
              <FloatingInput label="Proveedor (Yape, Plin...)" name="payment-account-wallet-provider" value={form.walletProvider} onChange={(event) => setForm((current) => ({ ...current, walletProvider: event.target.value }))} onBlur={() => markTouched("walletProvider")} error={fieldError("walletProvider")} requiredIndicator />
              <FloatingInput label="Teléfono o identificador" name="payment-account-wallet-phone" value={form.walletPhone} maxLength={15} inputMode="numeric" onChange={(event) => setForm((current) => ({ ...current, walletPhone: event.target.value.replace(/\D/g, "") }))} onBlur={() => markTouched("walletPhone")} error={fieldError("walletPhone")} autoComplete="off" requiredIndicator />
            </>
          ) : null}
          {form.type === "BANK_ACCOUNT" || form.type === "CREDIT_CARD" ? (
            <FloatingInput label="Titular" name="payment-account-holder" value={form.holderName} onChange={(event) => setForm((current) => ({ ...current, holderName: event.target.value }))} />
          ) : null}

          <label className="sm:col-span-2 flex min-h-11 items-center gap-3 rounded-md border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/70">
            <input type="checkbox" checked={form.isDefault} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} className="h-4 w-4 accent-primary" />
            Predeterminada para esta empresa, moneda y uso
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <SystemButton variant="outline" onClick={onClose} disabled={saving}>Cancelar</SystemButton>
          <SystemButton disabled={saving} loading={saving} onClick={() => void save()}>
            {account ? "Guardar cambios" : "Guardar cuenta"}
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}
