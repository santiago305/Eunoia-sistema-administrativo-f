import { Modal } from "@/components/settings/modal";
import { Payment } from "@/types/purchase";
import { CurrencyType, CurrencyTypes, PaymentType, PaymentTypes } from "@/types/purchaseEnums";
import { money, toDateInputValue, tryShowPicker } from "@/utils/functionPurchases";
import { createPayment } from "@/services/paymentService";
import { Banknote } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/common/utils/response";


const PRIMARY = "#21b8a6";

export type PaymentProps = {
  title:string,
  close: ()=> void,
  className?: string,
  totalToPay?:number,
  totalPaid?:number,
  quotaId?:string,
  poId:string,
  loadPurchases?: ()=>void;
  loadQuotas?: ()=>void;

}

type PaymentForm = Omit<Payment, "amount"> & { amount: string };

export function PaymentModal ({
  title,
  close,
  className,
  totalToPay = 0,
  totalPaid = 0,
  quotaId,
  poId,
  loadPurchases,
  loadQuotas
}: PaymentProps){
  const [form, setForm] = useState<PaymentForm>({
    method: PaymentTypes.EFECTIVO,
    date: new Date().toISOString(),
    operationNumber: "",
    currency: CurrencyTypes.PEN,
    amount: "",
    note: "",
    quotaId: null,
    poId:"",
  });
  const [saving, setSaving] = useState(false);
  const { showFlash, clearFlash } = useFlashMessage();

  const handleSave = async () => {
    if (saving) return;
    const amountNumber = Number(form.amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return;
    setSaving(true);
    clearFlash();
    try {
      const res = await createPayment({
        ...form,
        amount: amountNumber,
        quotaId: quotaId ?? null,
        poId: poId,
      });
      if(res.type === 'success'){
        showFlash(successResponse("Pago guardado con exito"));
        if (loadPurchases) {
            loadPurchases();
        }
        if (loadQuotas) {
            loadQuotas();
        }
      }else{
        showFlash(errorResponse("Error al guardar pago"))
      }
      close();
      setSaving(false);
    } catch {
      showFlash(errorResponse("Error al guardar pago"))
      setSaving(false);
    }
  };

  return (
    <Modal
      onClose={close}
      title={title}
      className={className}
    >
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-3xl border border-black/10 bg-emerald-50/70 p-4">
            <p className="text-xs text-black/60">Total Pagado</p>
            <div className="mt-1 text-xl font-semibold text-emerald-700 tabular-nums">{money(totalPaid, form.currency)}</div>
          </div>
          <div className="rounded-3xl border border-black/10 bg-rose-50/70 p-4">
            <p className="text-xs text-black/60">Total Pendiente</p>
            <div className="mt-1 text-xl font-semibold text-rose-700 tabular-nums">{money(totalToPay, form.currency)}</div>
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-[0.7fr_1fr] gap-4">
            <div>
              <label className="text-xs text-black/60">Monto</label>
              <div className="mt-2 space-y-3">
                <input
                  type="number"
                  min={0}
                  max={totalToPay}
                  className="h-14 w-full rounded-lg border border-black/10 bg-white px-4 text-lg outline-none focus:ring-2"
                  style={{ "--tw-ring-color": `${PRIMARY}33` } as CSSProperties}
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({...prev, amount: e.target.value}))}
                  onBlur={() => {
                    const num = Number(form.amount);
                    if (Number.isNaN(num)) return setForm((p) => ({ ...p, amount: "" }));
                    const clamped = Math.max(0, Math.min(num, totalToPay));
                    setForm((p) => ({ ...p, amount: String(clamped) }));
                  }}

                  placeholder="0"
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-lg text-white"
                  style={{ backgroundColor: PRIMARY, borderColor: `${PRIMARY}33` }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "guardando..." : "agregar"}
                  <Banknote className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-black/60">
                Fecha de pago
                <input
                  type="date"
                  className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                  style={{ "--tw-ring-color": `${PRIMARY}33` } as CSSProperties}
                  value={toDateInputValue(form.date)}
                  onClick={(e) => tryShowPicker(e.currentTarget)}
                  onChange={(e) => setForm((prev)=> ({...prev, date:e.target.value}))}
                />
              </label>
              <label className="text-xs text-black/60">
                Metodo
                <select
                  className="mt-2 h-11 w-full appearance-none rounded-lg border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                  style={{ "--tw-ring-color": `${PRIMARY}33` } as CSSProperties}
                  value={form.method}
                  onChange={(e) => setForm((prev) => ({...prev, method:e.target.value as PaymentType}))}
                >
                  {Object.values(PaymentTypes).map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-black/60">
                Moneda 
                <select
                  className="mt-2 h-11 w-full appearance-none rounded-lg border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                  style={{ "--tw-ring-color": `${PRIMARY}33` } as CSSProperties}
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({...prev, currency: e.target.value as CurrencyType }))}
                  disabled={true}
                >
                  <option value={CurrencyTypes.PEN}>PEN (S/)</option>
                  <option value={CurrencyTypes.USD}>USD ($)</option>
                </select>
              </label>
              <label className="text-xs text-black/60">
                Número de operación
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                  style={{ "--tw-ring-color": `${PRIMARY}33` } as CSSProperties}
                  value={form.operationNumber ?? ""}
                  onChange={(e) => setForm((prev) => ({...prev, operationNumber: e.target.value}))}
                  placeholder="Número de operación"
                />
              </label>
              <label className="text-xs text-black/60 sm:col-span-2">
                Nota
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-xs outline-none focus:ring-2"
                  style={{ "--tw-ring-color": `${PRIMARY}33` } as CSSProperties}
                  value={form.note ?? ""}
                  onChange={(e) => setForm((prev)=> ({...prev, note: e.target.value}))}
                  placeholder="Nota"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
} 
