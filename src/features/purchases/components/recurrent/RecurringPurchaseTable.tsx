import { Pause, Play, RefreshCw, XCircle } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type { RecurringPurchase, RecurringStatus } from "../../types/recurring-purchase.types";

const statusLabels: Record<RecurringStatus, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  CANCELLED: "Cancelada",
};

const frequencyLabels = {
  MONTHLY: "Mensual",
  ANNUAL: "Anual",
};

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(amount);

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(value)) : "-";

type Props = {
  items: RecurringPurchase[];
  loading: boolean;
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onPause: (item: RecurringPurchase) => void;
  onResume: (item: RecurringPurchase) => void;
  onCancel: (item: RecurringPurchase) => void;
  onGenerate: (item: RecurringPurchase) => void;
  permissions?: {
    canPause: boolean;
    canCancel: boolean;
    canGenerate: boolean;
  };
};

export function RecurringPurchaseTable({
  items,
  loading,
  page,
  limit,
  total,
  onPageChange,
  onPause,
  onResume,
  onCancel,
  onGenerate,
  permissions = { canPause: true, canCancel: true, canGenerate: true },
}: Props) {
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-black/10 text-sm">
          <thead className="bg-black/[0.03] text-left text-xs font-semibold uppercase tracking-normal text-black/60">
            <tr>
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Frecuencia</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Proximo vencimiento</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-black/60" colSpan={6}>
                  Cargando recurrentes...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-black/60" colSpan={6}>
                  No hay compras recurrentes registradas.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.recurringPurchaseTemplateId} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-black">{item.name}</div>
                    {item.description ? <div className="mt-1 text-xs text-black/55">{item.description}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-black/70">{frequencyLabels[item.frequency]}</td>
                  <td className="px-4 py-3 font-medium text-black">{formatMoney(item.amount, item.currency)}</td>
                  <td className="px-4 py-3 text-black/70">{formatDate(item.nextDueDate)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-black/10 px-2 py-1 text-xs font-medium text-black/70">
                      {statusLabels[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {permissions.canGenerate ? (
                        <SystemButton size="sm" variant="outline" title="Generar cuenta" onClick={() => onGenerate(item)}>
                          <RefreshCw className="h-4 w-4" />
                        </SystemButton>
                      ) : null}
                      {permissions.canPause && item.status === "ACTIVE" ? (
                        <SystemButton size="sm" variant="outline" title="Pausar" onClick={() => onPause(item)}>
                          <Pause className="h-4 w-4" />
                        </SystemButton>
                      ) : null}
                      {permissions.canPause && item.status === "PAUSED" ? (
                        <SystemButton size="sm" variant="outline" title="Reanudar" onClick={() => onResume(item)}>
                          <Play className="h-4 w-4" />
                        </SystemButton>
                      ) : null}
                      {permissions.canCancel && item.status !== "CANCELLED" ? (
                        <SystemButton size="sm" variant="outline" title="Cancelar" onClick={() => onCancel(item)}>
                          <XCircle className="h-4 w-4" />
                        </SystemButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-black/10 px-4 py-3 text-xs text-black/60">
        <span>
          Pagina {page} de {totalPages} · {total} registros
        </span>
        <div className="flex gap-2">
          <SystemButton size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Anterior
          </SystemButton>
          <SystemButton size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Siguiente
          </SystemButton>
        </div>
      </div>
    </div>
  );
}
