import { useMemo, type ReactNode } from "react";
import { Ban, Image, ImageOff, ImagePlus, MoreHorizontal } from "lucide-react";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { ActionsPopover } from "@/shared/components/components/ActionsPopover";
import type { Income } from "../types/income.types";
import type { DataTablePaginationMeta, DataTableRangeDates } from "@/shared/components/table/types";

type Props = {
  rows: Income[];
  loading?: boolean;
  canVoid?: boolean;
  canViewEvidence?: boolean;
  canAttachEvidence?: boolean;
  onVoid?: (row: Income) => void;
  rangeDates?: DataTableRangeDates;
  pagination?: DataTablePaginationMeta;
  onPageChange?: (page: number) => void;
  onEvidence?: (row: Income) => void;
  toolbarSearchContent?: ReactNode;
  emptyMessage?: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value || 0);

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
  return new Intl.DateTimeFormat("es-PE", {
    month: "short",
    timeZone: "UTC",
  })
    .format(parsed)
    .replace(".", "")
    .slice(0, 3)
    .toLocaleLowerCase("es-PE");
};

const detailTone = (detail: string | null) => {
  const normalized = detail?.trim().toLocaleLowerCase("es-PE") ?? "";
  if (normalized.includes("anticipo")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (normalized.includes("saldo")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-border bg-muted/60 text-muted-foreground";
};

const paymentMethodLabel = (row: Income) => row.paymentMethodCode === "BANK_TRANSFER"
  ? "Trans. bancaria"
  : row.paymentMethodName || row.method || "Sin método";

export function IncomeTable({ rows, loading, canVoid = false, canViewEvidence = false, canAttachEvidence = false, onVoid, onEvidence, rangeDates, pagination, onPageChange, toolbarSearchContent, emptyMessage }: Props) {
  const columns = useMemo<DataTableColumn<Income>[]>(
    () => [
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
          const canOpen = available ? canViewEvidence : canAttachEvidence && row.status !== "VOIDED";
          const Icon = available ? (canViewEvidence ? Image : ImageOff) : canOpen ? ImagePlus : ImageOff;
          const label = available ? (canViewEvidence ? "Ver evidencia del ingreso" : "Evidencia disponible; permiso requerido") : canOpen ? "Agregar evidencia al ingreso" : "Evidencia no disponible";
          return <button type="button" disabled={!canOpen} className={`mx-auto inline-flex h-11 w-11 items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-55 ${available ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"}`} aria-label={label} title={label} onClick={(event) => { event.stopPropagation(); if (canOpen) onEvidence?.(row); }}><Icon className="h-4 w-4" aria-hidden="true" /></button>;
        },
      },
      {
        id: "month",
        header: "Mes",
        visible: false,
        hideable: true,
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
        id: "operationNumber",
        header: "N.º de operación",
        hideable: true,
        copy: true,
        cell: (row) => row.operationNumber ?? "-",
      },
      {
        id: "method",
        header: "Método de pago",
        accessorKey: "paymentMethodName",
        hideable: true,
        cell: paymentMethodLabel,
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
        id: "saleOrderNumber",
        header: "N.º de pedido",
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
        id: "account",
        header: "Cuenta destino",
        hideable: true,
        cell: (row) => row.companyPaymentAccountLabel ?? "Sin cuenta asignada",
      },
      {
        id: "status",
        header: "Estado",
        hideable: false,
        cell: (row) => row.status === "VOIDED" ? (
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Anulado</span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Contabilizado</span>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        hideable: false,
        width: "76px",
        className: "text-center",
        cell: (row) => (!canVoid || row.status !== "POSTED") ? null : (
          <ActionsPopover
            actions={[{
              id: "void",
              label: "Anular ingreso",
              description: "Conserva el historial y recalcula el saldo",
              icon: <Ban className="h-4 w-4" />,
              danger: true,
              hidden: !canVoid || row.status !== "POSTED",
              onClick: () => onVoid?.(row),
            }]}
            triggerLabel={`Acciones del ingreso ${row.saleOrderNumber}`}
            triggerIcon={<MoreHorizontal className="h-4 w-4" />}
            compact
            columns={1}
            placement="bottom-end"
          />
        ),
      },
    ],
    [canAttachEvidence, canViewEvidence, canVoid, onEvidence, onVoid],
  );

  return (
    <DataTable
      tableId="income-table"
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
      rangeDates={rangeDates}
      toolbarSearchContent={toolbarSearchContent}
    />
  );
}
