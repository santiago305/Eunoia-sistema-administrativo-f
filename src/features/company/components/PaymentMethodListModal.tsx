import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/shared/components/settings/modal";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { PaymentMethodFormModal } from "@/features/payment-methods/components/PaymentMethodFormModal";
import { PaymentMethodSelectComposed } from "@/features/payment-methods/components/PaymentMethodSelectComposed";
import type { PaymentMethod, PaymentMethodPivot } from "@/features/payment-methods/types/paymentMethod";
import type { PaymentMethodSelectOption } from "@/features/payment-methods/types/paymentMethodSelect";
import { createCompanyMethod, deleteCompanyMethod, getAllPaymentMethods, getPaymentMethodsByCompany } from "@/shared/services/paymentMethodService";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { usePermissions } from "@/shared/hooks/usePermissions";

type PaymentMethodListModalProps = { title: string; close: () => void; className?: string; companyId: string };
const PRIMARY = "hsl(var(--primary))";
const defaultRequiresVoucher = (method: PaymentMethod | undefined) => {
  const value = (method?.code ?? method?.name ?? "").trim().toUpperCase();
  return value !== "CASH" && value !== "EFECTIVO";
};

export function PaymentMethodListModal({ title, close, className, companyId }: PaymentMethodListModalProps) {
  const { showFeedback, clearFeedback } = useFeedbackToast();
  const { can } = usePermissions();
  const canReadPaymentMethods = can("payment-methods.read");
  const canManagePaymentMethods = can("payment-methods.manage");
  const [rows, setRows] = useState<PaymentMethodPivot[]>([]);
  const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [requiresVoucher, setRequiresVoucher] = useState(true);
  const [openCreateMethod, setOpenCreateMethod] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [pendingRemoveMethod, setPendingRemoveMethod] = useState<PaymentMethodPivot | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadCompanyMethods = useCallback(async (options?: { silent?: boolean }) => {
    if (!companyId || !canReadPaymentMethods) return;
    if (!options?.silent) clearFeedback();
    setLoading(true);
    try { setRows((await getPaymentMethodsByCompany(companyId)) ?? []); }
    catch { setRows([]); if (!options?.silent) showFeedback(errorResponse("No se pudieron cargar los métodos de pago.")); }
    finally { setLoading(false); }
  }, [canReadPaymentMethods, clearFeedback, companyId, showFeedback]);

  const loadAllMethods = useCallback(async () => {
    if (!canReadPaymentMethods) return;
    try { setAllMethods((await getAllPaymentMethods()) ?? []); }
    catch { setAllMethods([]); showFeedback(errorResponse("No se pudieron cargar los métodos disponibles.")); }
  }, [canReadPaymentMethods, showFeedback]);

  useEffect(() => { void loadCompanyMethods(); void loadAllMethods(); }, [loadAllMethods, loadCompanyMethods]);

  const availableOptions = useMemo<PaymentMethodSelectOption[]>(() => {
    const selectedSet = new Set(rows.map((row) => row.methodId));
    return allMethods.filter((method) => method.isActive && !selectedSet.has(method.methodId)).map((method) => ({ value: method.methodId, label: method.name }));
  }, [allMethods, rows]);

  useEffect(() => {
    if (selectedId && !availableOptions.some((option) => option.value === selectedId)) setSelectedId("");
    setRequiresVoucher(defaultRequiresVoucher(allMethods.find((method) => method.methodId === selectedId)));
  }, [allMethods, availableOptions, selectedId]);

  const addMethod = useCallback(async () => {
    if (!companyId || !selectedId || adding || !canManagePaymentMethods) return;
    clearFeedback(); setAdding(true);
    try {
      await createCompanyMethod({ companyId, methodId: selectedId, requiresVoucher, enabled: true });
      showFeedback(successResponse("Método agregado.")); setSelectedId(""); setRequiresVoucher(true); await loadCompanyMethods({ silent: true });
    } catch { showFeedback(errorResponse("No se pudo agregar el método.")); }
    finally { setAdding(false); }
  }, [adding, canManagePaymentMethods, clearFeedback, companyId, loadCompanyMethods, requiresVoucher, selectedId, showFeedback]);

  const removeMethod = useCallback(async (companyMethodId?: string | null) => {
    if (!companyMethodId || !canManagePaymentMethods || removing) return;
    setRemoving(true);
    try { await deleteCompanyMethod(companyMethodId); showFeedback(successResponse("Método desvinculado.")); await loadCompanyMethods({ silent: true }); setPendingRemoveMethod(null); }
    catch { showFeedback(errorResponse("No se pudo desvincular el método.")); }
    finally { setRemoving(false); }
  }, [canManagePaymentMethods, loadCompanyMethods, removing, showFeedback]);

  const columns = useMemo<DataTableColumn<PaymentMethodPivot>[]>(() => [
    { id: "method", header: "Método", accessorKey: "name", className: "text-black/70" },
    { id: "code", header: "Código", cell: (row) => <span className="text-black/70">{row.code ?? "-"}</span>, className: "text-black/70" },
    { id: "requiresVoucher", header: "Evidencia", cell: (row) => row.requiresVoucher ? <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Obligatoria</span> : <span className="text-black/45">Opcional</span> },
    { id: "enabled", header: "Estado", cell: (row) => <span className="text-black/70">{row.enabled === false ? "Deshabilitado" : "Habilitado"}</span> },
    ...(canManagePaymentMethods ? [{ id: "actions", header: "", cell: (row: PaymentMethodPivot) => <div className="flex justify-end"><SystemButton variant="danger" size="custom" className="h-7 w-7 rounded-lg p-0" onClick={() => setPendingRemoveMethod(row)} title="Desvincular método"><Trash2 className="h-4 w-4" /></SystemButton></div>, className: "text-right", headerClassName: "text-right", hideable: false }] : []),
  ], [canManagePaymentMethods]);

  return (
    <Modal onClose={close} title={title} className={["w-full max-w-4xl", className].filter(Boolean).join(" ")}>
      <div className="space-y-4">
        <section aria-label="Agregar método de pago" className="rounded-xl border border-black/10 bg-black/[0.015] p-3 text-xs text-black/60 sm:p-4">
          <div data-testid="company-payment-method-form" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(175px,auto)_auto] xl:items-end">
            <PaymentMethodSelectComposed label="Método de pago" value={selectedId} onChange={setSelectedId} options={availableOptions} onCreate={canManagePaymentMethods ? () => setOpenCreateMethod(true) : undefined} onEdit={canManagePaymentMethods ? (methodId) => setEditingMethodId(methodId) : undefined} className="h-10" textSize="text-xs" disabled={adding || !canManagePaymentMethods} emptyLabel="Sin resultados" />
            <label className="flex min-h-10 items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-xs text-black/70 xl:whitespace-nowrap"><input type="checkbox" checked={requiresVoucher} onChange={(event) => setRequiresVoucher(event.target.checked)} className="h-4 w-4 accent-primary" disabled={adding || !canManagePaymentMethods} />Evidencia obligatoria</label>
            <SystemButton size="sm" className="h-10 w-full sm:col-span-2 xl:col-span-1 xl:w-auto" leftIcon={<Plus className="h-4 w-4" />} disabled={!selectedId || adding || !canManagePaymentMethods} onClick={addMethod} style={{ backgroundColor: PRIMARY, borderColor: `color-mix(in srgb, ${PRIMARY} 20%, transparent)` }}>{adding ? "Agregando..." : "Agregar"}</SystemButton>
          </div>
        </section>
        <DataTable tableId="company-methods-table" data={rows} columns={columns} rowKey="companyMethodId" loading={loading} emptyMessage="No hay métodos asignados." hoverable={false} animated={false} responsiveMode="table" />
      </div>
      <PaymentMethodFormModal open={canManagePaymentMethods && (openCreateMethod || Boolean(editingMethodId))} mode={editingMethodId ? "edit" : "create"} paymentMethodId={editingMethodId} onClose={() => { setOpenCreateMethod(false); setEditingMethodId(null); }} onSaved={() => { void loadAllMethods(); void loadCompanyMethods({ silent: true }); }} primaryColor={PRIMARY} entityLabel="método de pago" />
      <AlertModal open={Boolean(pendingRemoveMethod)} type="warning" title="Desvincular método de pago" message={pendingRemoveMethod ? `Estás por desvincular ${pendingRemoveMethod.name} de esta empresa.` : ""} confirmText="Desvincular" loading={removing} onClose={() => { if (!removing) setPendingRemoveMethod(null); }} onConfirm={() => { void removeMethod(pendingRemoveMethod?.companyMethodId); }} />
    </Modal>
  );
}
