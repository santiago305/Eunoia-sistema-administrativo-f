import { useEffect, useState } from "react";
import { SaleIncomeModal, type SaleIncomeModalValues } from "@/shared/components/payments/SaleIncomeModal";
import { useSaleOrderPaymentOptions, filterSaleOrderBankAccountOptions } from "@/features/sale-orders/components/useSaleOrderPaymentOptions";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { useAuth } from "@/shared/hooks/useAuth";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { correctPostedIncome, getIncomeEvidence, getIncomeEvidenceContent, uploadCorrectedIncomeEvidence } from "@/shared/services/incomeService";
import type { Income } from "../types/income.types";
import { clearPendingIncomeEvidenceUpload, clearPendingIncomeOperation, getOrCreatePendingIncomeEvidenceUpload, savePendingIncomeOperation, shouldRetainPendingIncomeEvidenceUpload, type PendingIncomeOperation } from "../services/income-operation-recovery";
import { createIdempotencyKey } from "@/shared/utils/idempotencyKey";

type Props = { open: boolean; income: Income | null; canViewEvidence: boolean; canReplaceEvidence: boolean; onClose: () => void; onSaved: () => void | Promise<void>; onCorrectionPending?: (operation: PendingIncomeOperation) => void; onCorrectionResolved?: (operation: PendingIncomeOperation) => void };
const newKey = createIdempotencyKey;

export function CorrectPostedIncomeModal({ open, income, canViewEvidence, canReplaceEvidence, onClose, onSaved, onCorrectionPending, onCorrectionResolved }: Props) {
  const { methodOptions, bankAccountOptions } = useSaleOrderPaymentOptions({ enabled: open });
  const { showFeedback } = useFeedbackToast();
  const { userId } = useAuth();
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmExcess, setConfirmExcess] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [correctedIncomeId, setCorrectedIncomeId] = useState<string | null>(null);
  const alreadyCorrected = Boolean(income && (income.correctedFromPaymentId || correctedIncomeId));

  useEffect(() => {
    if (!open || !income?.incomeId) { setEvidenceUrl(null); setEvidenceLoading(false); return; }
    setIdempotencyKey(newKey()); setConfirmExcess(false); setErrorMessage(null);
    setCorrectedIncomeId(income.correctedFromPaymentId ? income.incomeId : null);
    if (!canViewEvidence) { setEvidenceUrl(null); return; }
    let active = true; let objectUrl: string | null = null;
    setEvidenceUrl(null); setEvidenceLoading(true);
    void getIncomeEvidence(income.incomeId)
      .then((summary) => summary.available || summary.url ? getIncomeEvidenceContent(income.incomeId) : null)
      .then((url) => { if (active) { objectUrl = url; setEvidenceUrl(url); } else if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url); })
      .catch(() => { if (active) showFeedback(errorResponse("No se pudo cargar la evidencia existente.")); })
      .finally(() => { if (active) setEvidenceLoading(false); });
    return () => { active = false; if (objectUrl && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(objectUrl); };
  }, [canViewEvidence, income?.incomeId, income?.correctedFromPaymentId, open, showFeedback]);

  const values: SaleIncomeModalValues | null = income ? {
    id: income.incomeId, version: income.version, amount: income.amount,
    date: (income.paymentDate ?? income.date).slice(0, 10), paymentMethodId: income.paymentMethodId ?? "",
    companyPaymentAccountId: income.companyPaymentAccountId ?? "", operationNumber: income.operationNumber ?? "",
    note: income.detail ?? "", reason: alreadyCorrected ? ((income.financialReason?.trim().length ?? 0) >= 5 ? income.financialReason!.trim() : "Actualización de evidencia de corrección") : "",
    status: income.status, currency: income.currency, postedAt: income.postedAt, accountingDate: income.accountingDate,
    sourcePaymentId: income.correctedFromPaymentId,
  } : null;

  const submitEvidence = async (targetIncomeId: string, file: File) => {
    if (!userId) throw new Error("No se pudo guardar de forma segura la carga. Vuelve a iniciar sesión.");
    const operation = getOrCreatePendingIncomeEvidenceUpload(userId, targetIncomeId);
    try {
      await uploadCorrectedIncomeEvidence(targetIncomeId, file, operation.idempotencyKey);
      clearPendingIncomeEvidenceUpload(userId, targetIncomeId);
    } catch (error) {
      if (!shouldRetainPendingIncomeEvidenceUpload(error)) clearPendingIncomeEvidenceUpload(userId, targetIncomeId);
      throw error;
    }
  };

  const handleSubmit = async (draft: SaleIncomeModalValues, file: File | null) => {
    if (!income || saving) return;
    setSaving(true); setErrorMessage(null);
    let correctionOperation: PendingIncomeOperation | null = null;
    try {
      if (alreadyCorrected) {
        if (!file) { setErrorMessage("Selecciona una evidencia nueva o corregida para adjuntar."); return; }
        if (!canReplaceEvidence) { setErrorMessage("No tienes permiso para reemplazar la evidencia."); return; }
        await submitEvidence(correctedIncomeId ?? income.incomeId, file);
        showFeedback(successResponse("Evidencia del ingreso corregido actualizada correctamente."));
        await onSaved(); onClose(); return;
      }
      if (file && !canReplaceEvidence) { setErrorMessage("No tienes permiso para reemplazar la evidencia."); return; }
      if (!userId) { setErrorMessage("No se pudo guardar de forma segura la corrección. Vuelve a iniciar sesión."); return; }
      const payload = {
        version: income.version,
        amount: Math.round((Number(draft.amount) + Number.EPSILON) * 100) / 100,
        date: draft.date, paymentMethodId: draft.paymentMethodId,
        companyPaymentAccountId: draft.companyPaymentAccountId,
        operationNumber: draft.operationNumber.trim() || null, note: draft.note.trim() || null,
        reason: draft.reason.trim(), idempotencyKey, confirmExcess,
      };
      const operation: PendingIncomeOperation = {
        operationId: `income.correct:${income.incomeId}`, userId, incomeId: income.incomeId,
        kind: "income.correct", idempotencyKey,
        payload: { ...payload }, createdAt: new Date().toISOString(),
      };
      correctionOperation = operation;
      savePendingIncomeOperation(operation);
      onCorrectionPending?.(operation);
      const result = await correctPostedIncome(income.incomeId, payload);
      clearPendingIncomeOperation(operation);
      onCorrectionResolved?.(operation);
      correctionOperation = null;
      const newIncomeId = result?.incomeId ?? result?.correctedIncomeId;
      if (!newIncomeId) throw new Error("El servidor no devolvió el identificador del ingreso corregido.");
      setCorrectedIncomeId(newIncomeId);
      if (file) {
        try { await submitEvidence(newIncomeId, file); }
        catch (error) {
          await onSaved();
          const message = `La corrección ya quedó contabilizada, pero no se cargó la evidencia: ${parseApiError(error, "error de carga")}. Puedes reintentar la carga en esta ventana.`;
          setErrorMessage(message); showFeedback(errorResponse(message)); return;
        }
      }
      showFeedback(successResponse("Ingreso corregido: se revirtió el original y se contabilizó un nuevo registro."));
      await onSaved(); onClose();
    } catch (error) {
      const message = parseApiError(error, "No se pudo corregir el ingreso. Actualiza la información y vuelve a intentarlo.");
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        if (correctionOperation) {
          clearPendingIncomeOperation(correctionOperation);
          onCorrectionResolved?.(correctionOperation);
        }
        setErrorMessage(message); showFeedback(errorResponse(message));
        if (status === 409) await onSaved();
      } else {
        setErrorMessage(message); showFeedback(errorResponse(message));
        if (correctionOperation) {
          onCorrectionPending?.(correctionOperation);
          onClose();
        }
      }
    } finally { setSaving(false); }
  };

  return <SaleIncomeModal open={open} mode="correct-posted" values={values}
    description={income ? `${income.saleOrderNumber} · ${income.clientName} · ${alreadyCorrected ? "Solo se puede actualizar la evidencia del ingreso corregido." : "La corrección revierte este registro y crea otro contabilizado."}` : undefined}
    evidenceUrl={evidenceUrl} evidenceLoading={evidenceLoading} canViewEvidence={canViewEvidence} canUploadEvidence={canReplaceEvidence}
    methodOptions={methodOptions} bankAccountOptions={bankAccountOptions} getCompatibleAccounts={filterSaleOrderBankAccountOptions}
    saving={saving} financialFieldsReadOnly={alreadyCorrected} submitLabel={alreadyCorrected ? "Guardar evidencia" : undefined} reasonLabel="Motivo de la corrección"
    errorMessage={errorMessage} extraContent={!alreadyCorrected ? <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmExcess} disabled={saving} onChange={(event) => setConfirmExcess(event.target.checked)} /><span>Confirmo que el importe puede superar el saldo del pedido y generar un saldo a favor.</span></label> : null}
    onClose={onClose} onSubmit={handleSubmit} />;
}
