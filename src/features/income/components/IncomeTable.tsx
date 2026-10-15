import { useMemo, type ReactNode } from "react";
import { ArrowRightLeft, Ban, CheckCircle2, Image, ImageOff, ImagePlus, Landmark, MoreHorizontal, Pencil, ReceiptText, RotateCcw } from "lucide-react";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn, DataTablePaginationMeta, DataTableRangeDates, DataTableSelectionChangeMeta } from "@/shared/components/table/types";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import type { Income } from "../types/income.types";

type Props = {
  rows: Income[];
  loading?: boolean;
  canPost?: boolean;
  canCancel?: boolean;
  canReverse?: boolean;
  canReenter?: boolean;
  canEditPending?: boolean;
  canTransferPending?: boolean;
  canCorrectPosted?: boolean;
  canReplaceCorrectedEvidence?: boolean;
  canViewEvidence?: boolean;
  canViewRefunds?: boolean;
  canViewReconciliation?: boolean;
  onVoid?: (row: Income) => void;
  onPost?: (row: Income) => void;
  onEdit?: (row: Income) => void;
  onTransfer?: (row: Income) => void;
  onCorrect?: (row: Income) => void;
  rangeDates?: DataTableRangeDates;
  pagination?: DataTablePaginationMeta;
  onPageChange?: (page: number) => void;
  onEvidence?: (row: Income) => void;
  onRefunds?: (row: Income) => void;
  onReconciliation?: (row: Income) => void;
  toolbarSearchContent?: ReactNode;
  emptyMessage?: string;
  selectedRowKeys?: string[];
  onSelectedRowKeysChange?: (keys: string[], meta: DataTableSelectionChangeMeta<Income>) => void;
  toolbarActions?: ReactNode;
};

const money = (value: number, currency = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);

const parseDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const paymentDate = (value: string) => {
  const parsed = parseDate(value);
  if (!parsed) return value;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
};

const paymentMonth = (value: string) => {
  const parsed = parseDate(value);
  if (!parsed) return "-";
  return new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" })
    .format(parsed)
    .replace(".", "")
    .slice(0, 3)
    .toLocaleLowerCase("es-PE");
};

const detailTone = (detail: string | null) => {
  const normalized = detail?.trim().toLocaleLowerCase("es-PE") ?? "";
  if (normalized.includes("anticipo")) return "border-sky-200 bg-sky-50 text-sky-700";
  if (normalized.includes("saldo")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-border bg-muted/60 text-muted-foreground";
};

const paymentMethodLabel = (row: Income) => row.paymentMethodCode === "BANK_TRANSFER"
  ? "Trans. bancaria"
  : row.paymentMethodName || row.method || "Sin método";

export function IncomeTable({
  rows,
  loading,
  canPost = false,
  canCancel = false,
  canReverse = false,
  canReenter = false,
  canEditPending = false,
  canTransferPending = false,
  canCorrectPosted = false,
  canReplaceCorrectedEvidence = false,
  canViewEvidence = false,
  canViewRefunds = false,
  canViewReconciliation = false,
  onVoid,
  onPost,
  onEdit,
  onTransfer,
  onCorrect,
  onEvidence,
  onRefunds,
  onReconciliation,
  rangeDates,
  pagination,
  onPageChange,
  toolbarSearchContent,
  emptyMessage,
  selectedRowKeys,
  onSelectedRowKeysChange,
  toolbarActions,
}: Props) {
  const columns = useMemo<DataTableColumn<Income>[]>(
    () => [
      {
        id: "month",
        header: "Mes",
        visible: true,
        hideable: false,
        lockPosition: true,
        width: "72px",
        className: "font-semibold uppercase text-muted-foreground",
        cell: (row) => paymentMonth(row.date),
        sortAccessor: (row) => new Date(row.date),
      },
      {
        id: "date",
        header: "Fecha",
        accessorKey: "date",
        hideable: false,
        width: "132px",
        cell: (row) => paymentDate(row.date),
        sortAccessor: (row) => new Date(row.date),
      },
      {
        id: "saleOrderNumber",
        header: "Pedido",
        accessorKey: "saleOrderNumber",
        hideable: false,
        copy: true,
        className: "font-semibold tabular-nums",
        cardTitle: true,
      },
      {
        id: "detail",
        header: "Detalle",
        accessorKey: "detail",
        hideable: true,
        cell: (row) => (
          <span
            className={`inline-flex max-w-full rounded-full border px-2 py-0.5 text-[11px] font-semibold ${detailTone(row.detail)}`}
            title={row.detail ?? "Sin detalle"}
          >
            <span className="truncate">{row.detail?.trim() || "Sin detalle"}</span>
          </span>
        ),
      },
      {
        id: "operationNumber",
        header: "Operación",
        hideable: true,
        copy: true,
        cell: (row) => row.operationNumber ?? "-",
      },
      {
        id: "method",
        header: "Método",
        accessorKey: "paymentMethodName",
        hideable: true,
        cell: paymentMethodLabel,
      },
      {
        id: "account",
        header: "Cuenta",
        hideable: true,
        cell: (row) => row.companyPaymentAccountLabel ?? "Sin cuenta asignada",
      },
      {
        id: "amount",
        header: "Monto",
        accessorKey: "amount",
        hideable: false,
        className: "text-right font-semibold tabular-nums",
        headerClassName: "text-right [&>div]:justify-end",
        cell: (row) => money(row.amount),
      },
      {
        id: "status",
        header: "Estado",
        hideable: false,
        cell: (row) => {
          const status = row.status;
          const label = status === "PENDING_CONFIRMATION" ? "Por confirmar" : status === "POSTED" ? "Contabilizado" : status === "CANCELLED" ? "Cancelado" : status === "REVERSED" ? "Revertido" : "Estado desconocido";
          const tone = status === "PENDING_CONFIRMATION" ? "border-amber-200 bg-amber-50 text-amber-800" : status === "POSTED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "CANCELLED" || status === "REVERSED" ? "border-red-200 bg-red-50 text-red-700" : "border-zinc-300 bg-zinc-50 text-zinc-700";
          return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{label}</span>;
        },
      },
      {
        id: "reconciliation",
        header: "Conciliación",
        hideable: true,
        cell: (row) => {
          if (row.status !== "POSTED") return <span className="text-xs text-zinc-600">No aplica</span>;
          const status = row.reconciliationStatus ?? "UNRECONCILED";
          const label = status === "RECONCILED" ? "Conciliado" : status === "PARTIALLY_RECONCILED" ? "Conciliación parcial" : "Sin conciliar";
          const tone = status === "RECONCILED" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : status === "PARTIALLY_RECONCILED" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-zinc-300 bg-zinc-50 text-zinc-800";
          return <div className="space-y-1"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>{label}</span><span className="block text-xs tabular-nums text-zinc-700">{money(row.reconciledAmount ?? 0, row.currency ?? "PEN")} / {money(row.amount, row.currency ?? "PEN")}</span></div>;
        },
      },
      {
        id: "evidence",
        header: "Evidencia",
        hideable: true,
        visible: true,
        width: "84px",
        stopRowClick: true,
        sortable: false,
        searchable: false,
        showInCards: true,
        cardLabel: "Evidencia",
        className: "text-center",
        headerClassName: "text-center [&>div]:justify-center",
        cell: (row) => {
          const available = Boolean(row.evidence?.available || row.evidence?.status === "AVAILABLE" || row.evidenceUrl);
          const canOpen = available ? canViewEvidence : row.status === "PENDING_CONFIRMATION" && canEditPending;
          const Icon = available ? (canViewEvidence ? Image : ImageOff) : canOpen ? ImagePlus : ImageOff;
          const label = available
            ? (canViewEvidence ? "Ver evidencia del ingreso" : "Evidencia disponible; permiso requerido")
            : canOpen ? "Editar ingreso y agregar evidencia" : "Evidencia no disponible";

          return (
            <button
              type="button"
              disabled={!canOpen}
              className="mx-auto inline-flex cursor-pointer items-center justify-center rounded p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-55"
              aria-label={label}
              title={label}
              onClick={(event) => {
                event.stopPropagation();
                if (!canOpen) return;
                if (!available && row.status === "PENDING_CONFIRMATION") onEdit?.(row);
                else onEvidence?.(row);
              }}
            >
              <Icon
                className={`h-4 w-4 ${available ? "text-muted-foreground hover:text-foreground" : "text-red-600 hover:text-red-700"}`}
                aria-hidden="true"
              />
            </button>
          );
        },
      },
      {
        id: "actions",
        header: "Acciones",
        hideable: false,
        lockPosition: true,
        width: "76px",
        className: "text-center",
        cell: (row) => {
          const pending = row.status === "PENDING_CONFIRMATION";
          const posted = row.status === "POSTED";
          const closed = row.status === "CANCELLED" || row.status === "REVERSED";
          const actions = [
            { id: "view", label: "Ver detalle", description: "Consultar datos y evidencia", icon: <Image className="h-4 w-4" />, hidden: false, onClick: () => onEvidence?.(row) },
            { id: "edit", label: "Editar ingreso", description: "Modificar datos y evidencia mientras está por confirmar", icon: <Pencil className="h-4 w-4" />, hidden: !pending || !canEditPending, onClick: () => onEdit?.(row) },
            { id: "correct", label: "Corregir ingreso contabilizado", description: "Revertir el registro y crear su versión corregida", icon: <Pencil className="h-4 w-4" />, hidden: !posted || !canCorrectPosted, onClick: () => onCorrect?.(row) },
            { id: "corrected-evidence", label: "Actualizar evidencia corregida", description: "Adjuntar o reemplazar evidencia sin volver a contabilizar", icon: <Image className="h-4 w-4" />, hidden: !posted || !row.correctedFromPaymentId || !canReplaceCorrectedEvidence, onClick: () => onCorrect?.(row) },
            { id: "transfer", label: "Transferir a otro pedido", description: "Mover el pago pendiente a otro pedido del mismo cliente y moneda", icon: <ArrowRightLeft className="h-4 w-4" />, hidden: !pending || !canTransferPending, onClick: () => onTransfer?.(row) },
            { id: "post", label: "Contabilizar", description: "Validar y confirmar este ingreso", icon: <CheckCircle2 className="h-4 w-4" />, hidden: !pending || !canPost, onClick: () => onPost?.(row) },
            { id: "cancel", label: "Cancelar ingreso", description: "Cerrar sin generar un movimiento contable", icon: <Ban className="h-4 w-4" />, danger: true, hidden: !pending || !canCancel, onClick: () => onVoid?.(row) },
            { id: "reverse", label: "Revertir ingreso", description: "Crear el movimiento financiero contrario", icon: <RotateCcw className="h-4 w-4" />, danger: true, hidden: !posted || !canReverse, onClick: () => onVoid?.(row) },
            { id: "refunds", label: "Ver reembolsos", description: "Consultar o gestionar devoluciones vinculadas a este ingreso", icon: <ReceiptText className="h-4 w-4" />, hidden: !posted || !canViewRefunds, onClick: () => onRefunds?.(row) },
            { id: "reconciliation", label: "Conciliación bancaria", description: "Consultar o gestionar las asignaciones al extracto bancario", icon: <Landmark className="h-4 w-4" />, hidden: !posted || !canViewReconciliation, onClick: () => onReconciliation?.(row) },
            { id: "reenter", label: "Reingresar", description: "Crear un nuevo ingreso por confirmar", icon: <CheckCircle2 className="h-4 w-4" />, hidden: !closed || !canReenter, onClick: () => onPost?.(row) },
          ];
          if (actions.every((action) => action.hidden)) return null;
          return (
          <ActionsPopover
            actions={actions}
            triggerLabel={`Acciones del ingreso ${row.saleOrderNumber}`}
            triggerIcon={<MoreHorizontal className="h-4 w-4" />}
            compact
            columns={1}
            placement="bottom-end"
          />
          );
        },
      },
    ],
    [canCancel, canCorrectPosted, canEditPending, canPost, canReenter, canReplaceCorrectedEvidence, canReverse, canTransferPending, canViewEvidence, canViewRefunds, canViewReconciliation, onCorrect, onEdit, onEvidence, onPost, onRefunds, onReconciliation, onTransfer, onVoid],
  );

  return (
    <DataTable
      tableId="income-table-v3"
      data={rows}
      columns={columns}
      rowKey="incomeId"
      loading={loading}
      emptyMessage={emptyMessage ?? "Sin ingresos para mostrar."}
      hoverable
      animated={false}
      responsiveCards
      initialSort={{ columnId: "date", direction: "desc" }}
      maxHeight="none"
      pagination={pagination}
      onPageChange={onPageChange}
      selectableColumns
      showSelectionInfo={false}
      selectableRows={Boolean(onSelectedRowKeysChange)}
      isRowSelectable={(row) => row.status === "PENDING_CONFIRMATION"}
      selectedRowKeys={selectedRowKeys}
      onSelectedRowKeysChange={onSelectedRowKeysChange}
      rangeDates={rangeDates}
      toolbarSearchContent={toolbarSearchContent}
      toolbarActions={toolbarActions}
    />
  );
}
