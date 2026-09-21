import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { getAllPaymentMethods } from "@/shared/services/paymentMethodService";
import { createSupplierPaymentDestination, listSupplierPaymentDestinations, setDefaultSupplierPaymentDestination, updateSupplierPaymentDestination, type SupplierPaymentDestination } from "@/shared/services/supplierService";
import type { PaymentMethod } from "@/features/payment-methods/types/paymentMethod";

type Props = { title: string; close: () => void; className?: string; supplierId: string };
const types = ["BANK_ACCOUNT", "DIGITAL_WALLET", "CARD", "CASH"] as const;
const labels: Record<string, string> = { BANK_ACCOUNT: "Cuenta bancaria", DIGITAL_WALLET: "Billetera digital", CARD: "Tarjeta", CASH: "Efectivo" };

export function ProviderPaymentDestinationListModal({ title, close, className, supplierId }: Props) {
  const { showFeedback } = useFeedbackToast();
  const [rows, setRows] = useState<SupplierPaymentDestination[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodId, setMethodId] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("BANK_ACCOUNT");
  const [currency, setCurrency] = useState<"PEN" | "USD">("PEN");
  const [name, setName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [providerName, setProviderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cci, setCci] = useState("");
  const [walletIdentifier, setWalletIdentifier] = useState("");
  const [holderName, setHolderName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try { setRows(await listSupplierPaymentDestinations(supplierId, { includeInactive: true })); } catch { showFeedback(errorResponse("No se pudieron cargar los destinos de pago.")); }
  }, [showFeedback, supplierId]);
  useEffect(() => { void load(); void getAllPaymentMethods().then(setMethods).catch(() => setMethods([])); }, [load]);

  const compatibleMethods = useMemo(() => methods.filter((method) => {
    if (!method.isActive) return false;
    if (type === "DIGITAL_WALLET") return method.code === "DIGITAL_WALLET";
    if (type === "CARD") return method.code === "CARD";
    if (type === "CASH") return method.code === "CASH";
    return ["BANK_TRANSFER", "BANK_DEPOSIT", "CHECK"].includes(method.code ?? "");
  }), [methods, type]);

  const save = async () => {
    if (!methodId || !name.trim() || saving) return;
    setFormError("");
    setSaving(true);
    try {
      const payload = { supplierId, methodId, type, currency, name: name.trim(), institutionName: institutionName.trim() || undefined, providerName: providerName.trim() || undefined, accountNumber: accountNumber.trim() || undefined, cci: cci.trim() || undefined, walletIdentifier: walletIdentifier.trim() || undefined, holderName: holderName.trim() || undefined, isDefault, isActive: true, requiresManualReview: false };
      if (editingId) await updateSupplierPaymentDestination(editingId, payload);
      else await createSupplierPaymentDestination(payload);
      showFeedback(successResponse(editingId ? "Destino revisado y actualizado" : "Destino de pago creado"));
      setEditingId(null); setName(""); setInstitutionName(""); setProviderName(""); setAccountNumber(""); setCci(""); setWalletIdentifier(""); setHolderName(""); setIsDefault(false); await load();
    } catch {
      setFormError("No se pudo guardar. Completa el identificador real y verifica el tipo, método y moneda.");
      showFeedback(errorResponse("No se pudo guardar el destino. Verifica el tipo y los datos."));
    } finally { setSaving(false); }
  };

  const review = (row: SupplierPaymentDestination) => {
    setEditingId(row.supplierPaymentDestinationId);
    setMethodId(row.methodId);
    setType(row.type);
    setCurrency(row.currency);
    setName(row.name);
    setInstitutionName(row.institutionName ?? "");
    setProviderName(row.providerName ?? "");
    setHolderName(row.holderName ?? "");
    setAccountNumber(""); setCci(""); setWalletIdentifier(""); setIsDefault(false); setFormError("");
  };

  return <Modal open onClose={close} title={title} className={className}>
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-xs text-black/65"><ShieldCheck className="mr-1 inline h-4 w-4 text-primary" />Los números completos se cifran y sólo se muestran los últimos cuatro dígitos.</div>
      {editingId ? <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">Revisión manual: confirma el identificador completo antes de activar este destino.</p> : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label>Tipo<select className="mt-1 h-10 w-full rounded-md border border-black/10 px-2" value={type} onChange={(e) => { setType(e.target.value as typeof type); setMethodId(""); }}><option value="BANK_ACCOUNT">Cuenta bancaria</option><option value="DIGITAL_WALLET">Billetera digital</option><option value="CARD">Tarjeta</option><option value="CASH">Efectivo</option></select></label>
        <label>Moneda<select className="mt-1 h-10 w-full rounded-md border border-black/10 px-2" value={currency} onChange={(e) => setCurrency(e.target.value as "PEN" | "USD")}><option value="PEN">PEN</option><option value="USD">USD</option></select></label>
        <label>Nombre<input className="mt-1 h-10 w-full rounded-md border border-black/10 px-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. BCP proveedor" /></label>
        <label>Método compatible<select className="mt-1 h-10 w-full rounded-md border border-black/10 px-2" value={methodId} onChange={(e) => setMethodId(e.target.value)}><option value="">Selecciona</option>{compatibleMethods.map((method) => <option key={method.methodId} value={method.methodId}>{method.name}</option>)}</select></label>
        {type === "BANK_ACCOUNT" && <><label>Banco<input className="mt-1 h-10 w-full rounded-md border border-black/10 px-2" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} /></label><label>Número de cuenta<input className="mt-1 h-10 w-full rounded-md border border-black/10 px-2" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></label><label className="col-span-2">CCI (20 dígitos)<input className="mt-1 h-10 w-full rounded-md border border-black/10 px-2" value={cci} onChange={(e) => setCci(e.target.value)} /></label></>}
        {type === "DIGITAL_WALLET" && <><label>Proveedor<input className="mt-1 h-10 w-full rounded-md border border-black/10 px-2" value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="Yape o Plin" /></label><label>Teléfono / identificador<input className="mt-1 h-10 w-full rounded-md border border-black/10 px-2" value={walletIdentifier} onChange={(e) => setWalletIdentifier(e.target.value)} /></label></>}
        {type === "CARD" && <label>Últimos cuatro dígitos<input maxLength={4} className="mt-1 h-10 w-full rounded-md border border-black/10 px-2" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></label>}
        {type !== "CASH" && <label>Titular<input className="mt-1 h-10 w-full rounded-md border border-black/10 px-2" value={holderName} onChange={(e) => setHolderName(e.target.value)} /></label>}
      </div>
      {formError ? <p role="alert" className="text-xs text-red-600">{formError}</p> : null}
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Predeterminado para esta moneda y tipo</label>
      <div className="flex justify-end gap-2">{editingId ? <SystemButton size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar revisión</SystemButton> : null}<SystemButton size="sm" leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />} disabled={saving || !methodId || !name.trim()} onClick={() => void save()}>{editingId ? "Confirmar destino" : "Crear destino"}</SystemButton></div>
      <div className="space-y-2 border-t border-black/10 pt-3"><p className="text-xs font-semibold text-black/60">Destinos configurados</p>{rows.length === 0 ? <p className="text-xs text-black/45">No hay destinos configurados.</p> : rows.map((row) => <div key={row.supplierPaymentDestinationId} className="flex flex-col gap-2 rounded-md border border-black/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{row.maskedLabel}</p><p className="text-xs text-black/50">{labels[row.type]} · {row.currency}{row.requiresManualReview ? " · Revisión pendiente" : row.isActive ? " · Activo" : " · Inactivo"}</p></div><div className="flex items-center gap-2">{row.requiresManualReview ? <SystemButton size="sm" variant="outline" onClick={() => review(row)}>Revisar</SystemButton> : row.isDefault ? <span className="text-xs font-semibold text-primary">Predeterminado</span> : row.isActive ? <button type="button" className="min-h-10 rounded px-2 text-xs text-primary underline" onClick={() => void setDefaultSupplierPaymentDestination(row.supplierPaymentDestinationId).then(load)}>Marcar predeterminado</button> : null}</div></div>)}</div>
    </div>
  </Modal>;
}
