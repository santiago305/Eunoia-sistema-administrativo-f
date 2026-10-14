import { useEffect, useRef, useState } from "react";
import { SaleIncomeModal, type SaleIncomeModalValues } from "@/shared/components/payments/SaleIncomeModal";
import { useSaleOrderPaymentOptions, filterSaleOrderBankAccountOptions } from "@/features/sale-orders/components/useSaleOrderPaymentOptions";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { editPendingIncome, getIncomeEvidenceContent, getIncomeEvidence, uploadIncomeEvidence } from "@/shared/services/incomeService";
import type { Income } from "../types/income.types";
import { clearPendingIncomeEvidenceUpload, clearPendingIncomeOperation, getOrCreatePendingIncomeEvidenceUpload, listPendingIncomeOperations, savePendingIncomeOperation, shouldRetainPendingIncomeEvidenceUpload, type PendingIncomeOperation } from "../services/income-operation-recovery";
import { createIdempotencyKey } from "@/shared/utils/idempotencyKey";

type Props = { open: boolean; income: Income | null; userId: string | null; canViewEvidence: boolean; canAttachEvidence: boolean; onClose: () => void; onSaved: () => void | Promise<void> };
type EditPayload = { version: number; amount: number; date: string; paymentMethodId: string; companyPaymentAccountId: string; operationNumber: string | null; note: string | null };
const newIdempotencyKey = createIdempotencyKey;

export function IncomePendingEditModal({ open, income, userId, canViewEvidence, canAttachEvidence, onClose, onSaved }: Props) {
  const { methodOptions, bankAccountOptions } = useSaleOrderPaymentOptions({ enabled: open });
  const { showFeedback } = useFeedbackToast();
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveryOperation, setRecoveryOperation] = useState<PendingIncomeOperation | null>(null);
  const [evidenceUploadPending, setEvidenceUploadPending] = useState(false);
  const pendingEvidenceRef = useRef<File | null>(null);
  const incomeId = income?.incomeId;

  useEffect(() => {
    if (!open || !incomeId || !userId) { setRecoveryOperation(null); return; }
    const pendingOperations = listPendingIncomeOperations(userId, incomeId);
    setRecoveryOperation(pendingOperations.find((operation) => operation.kind === "income.edit-pending") ?? null);
    setEvidenceUploadPending(pendingOperations.some((operation) => operation.kind === "income.evidence-upload"));
  }, [incomeId, open, userId]);

  useEffect(() => {
    if (!open || !incomeId || !canViewEvidence) { setEvidenceUrl(null); setEvidenceLoading(false); return; }
    let active = true;
    let objectUrl: string | null = null;
    setEvidenceUrl(null);
    setEvidenceLoading(true);
    void getIncomeEvidence(incomeId)
      .then((summary) => summary.available || summary.url ? getIncomeEvidenceContent(incomeId) : null)
      .then((url) => { if (active) { objectUrl = url; setEvidenceUrl(url); } else if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url); })
      .catch(() => { if (active) showFeedback(errorResponse("No se pudo cargar la evidencia existente.")); })
      .finally(() => { if (active) setEvidenceLoading(false); });
    return () => { active = false; if (objectUrl && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(objectUrl); };
  }, [canViewEvidence, incomeId, open, showFeedback]);

  const values: SaleIncomeModalValues | null = income ? {
    id: income.incomeId,
    version: income.version,
    amount: income.amount,
    date: (income.paymentDate ?? income.date).slice(0, 10),
    paymentMethodId: income.paymentMethodId ?? "",
    companyPaymentAccountId: income.companyPaymentAccountId ?? "",
    operationNumber: income.operationNumber ?? "",
    note: income.detail ?? "",
    reason: "",
    status: income.status,
    currency: income.currency,
  } : null;

  const handleSubmit = async (draft: SaleIncomeModalValues, file: File | null, replay = false) => {
    if (!income || saving) return;
    if (file && !canAttachEvidence) { setErrorMessage("No tienes permiso para reemplazar la evidencia."); return; }
    if (!userId) { setErrorMessage("No se pudo guardar de forma segura la edición. Vuelve a iniciar sesión."); return; }
    const currentPayload: EditPayload = {
      version: income.version,
      amount: Math.round((Number(draft.amount) + Number.EPSILON) * 100) / 100,
      date: draft.date,
      paymentMethodId: draft.paymentMethodId,
      companyPaymentAccountId: draft.companyPaymentAccountId,
      operationNumber: draft.operationNumber.trim() || null,
      note: draft.note.trim() || null,
    };
    if (file) pendingEvidenceRef.current = file;
    const existing = recoveryOperation ?? listPendingIncomeOperations(userId, income.incomeId).find((operation) => operation.kind === "income.edit-pending") ?? null;
    if (existing && !replay && JSON.stringify(existing.payload) !== JSON.stringify(currentPayload)) {
      setErrorMessage("Hay una edición con resultado incierto. Recupera primero la solicitud guardada sin cambiar sus datos.");
      return;
    }
    const payload = replay && existing ? existing.payload as unknown as EditPayload : currentPayload;
    const operation: PendingIncomeOperation = existing ?? {
      operationId: `income.edit-pending:${income.incomeId}`,
      userId,
      incomeId: income.incomeId,
      kind: "income.edit-pending",
      idempotencyKey: newIdempotencyKey(),
      payload,
      createdAt: new Date().toISOString(),
    };
    if (!existing) savePendingIncomeOperation(operation);
    setSaving(true); setErrorMessage(null);
    try {
      await editPendingIncome(income.incomeId, { ...payload, idempotencyKey: operation.idempotencyKey });
      clearPendingIncomeOperation(operation);
      setRecoveryOperation(null);
      if (file) {
        try {
          const evidenceOperation = getOrCreatePendingIncomeEvidenceUpload(userId, income.incomeId);
          await uploadIncomeEvidence(income.incomeId, file, evidenceOperation.idempotencyKey);
          clearPendingIncomeEvidenceUpload(userId, income.incomeId);
          setEvidenceUploadPending(false);
        }
        catch (error) {
          const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
          if (shouldRetainPendingIncomeEvidenceUpload(error)) {
            setEvidenceUploadPending(true);
          } else {
            clearPendingIncomeEvidenceUpload(userId, income.incomeId);
            setEvidenceUploadPending(false);
          }
          const retryHint = code === "IDEMPOTENCY_KEY_REUSED"
            ? "La clave pendiente corresponde a otro archivo; vuelve a guardar para iniciar una carga nueva."
            : "Puedes reintentar la carga con el mismo archivo.";
          const message = `Los datos se guardaron, pero no se pudo reemplazar la evidencia: ${parseApiError(error, "error de carga")}. ${retryHint}`;
          setErrorMessage(message); showFeedback(errorResponse(message));
          await onSaved();
          return;
        }
      }
      pendingEvidenceRef.current = null;
      showFeedback(successResponse("Ingreso actualizado correctamente."));
      await onSaved(); onClose();
    } catch (error) {
      const message = parseApiError(error, "No se pudo actualizar el ingreso. Actualiza la lista y vuelve a intentarlo.");
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        clearPendingIncomeOperation(operation);
        setRecoveryOperation(null);
        setErrorMessage(message); showFeedback(errorResponse(message));
        if (status === 409) await onSaved();
      } else {
        savePendingIncomeOperation(operation);
        setRecoveryOperation(operation);
        const recoveryMessage = "No se confirmó si la edición se guardó. Reintenta la misma solicitud; no cambies los datos hasta resolverla.";
        setErrorMessage(recoveryMessage);
        showFeedback(errorResponse("La respuesta del guardado no llegó. Conservamos la solicitud para reintentar sin duplicar cambios."));
      }
    } finally { setSaving(false); }
  };

  const retryUncertainEdit = async () => {
    if (!recoveryOperation || !values) return;
    const payload = recoveryOperation.payload as unknown as EditPayload;
    await handleSubmit({
      ...values,
      ...payload,
      operationNumber: payload.operationNumber ?? "",
      note: payload.note ?? "",
      reason: "",
    }, pendingEvidenceRef.current, true);
  };

  const recoveryContent = recoveryOperation ? <section aria-label="Edición pendiente por recuperar" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
    <p>No se confirmó la respuesta del guardado anterior. Reintenta exactamente esa edición; el servidor evitará duplicarla.{!pendingEvidenceRef.current ? " Si habías seleccionado una imagen y recargaste la página, vuelve a cargarla después de recuperar los datos." : ""}</p>
    <button type="button" className="min-h-11 rounded-md border border-amber-700 px-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60" onClick={() => void retryUncertainEdit()} disabled={saving}>Reintentar edición guardada</button>
  </section> : null;
  const evidenceRecoveryContent = evidenceUploadPending ? <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">La respuesta de la carga de evidencia quedó pendiente. Selecciona el mismo archivo y guarda para recuperar el resultado sin crear otra revisión.</p> : null;

  return <SaleIncomeModal open={open} mode="edit-pending" values={values} description={income ? `${income.saleOrderNumber} · ${income.clientName}` : undefined} evidenceUrl={evidenceUrl} evidenceLoading={evidenceLoading}
    canViewEvidence={canViewEvidence} canUploadEvidence={canAttachEvidence} methodOptions={methodOptions} bankAccountOptions={bankAccountOptions}
    getCompatibleAccounts={filterSaleOrderBankAccountOptions} saving={saving} submitDisabled={Boolean(recoveryOperation)} errorMessage={errorMessage} extraContent={<>{recoveryContent}{evidenceRecoveryContent}</>}
    onClose={onClose} onSubmit={handleSubmit} />;
}
