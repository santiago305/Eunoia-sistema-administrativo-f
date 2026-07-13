import { Eye, Menu, Pause, Pencil, Play, RefreshCw, Wallet, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { ActionsPopover, type ActionItem } from "@/shared/components/components/ActionsPopover";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
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
  onEdit?: (item: RecurringPurchase) => void;
  onGenerate: (item: RecurringPurchase) => void;
  onRegisterPayment: (item: RecurringPurchase) => void;
  onViewPayable?: (item: RecurringPurchase) => void;
  toolbarSearchContent?: ReactNode;
  permissions?: {
    canPause: boolean;
    canCancel: boolean;
    canEdit?: boolean;
    canGenerate: boolean;
    canRegisterPayment?: boolean;
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
  onEdit,
  onGenerate,
  onRegisterPayment,
  onViewPayable,
  toolbarSearchContent,
  permissions = { canPause: true, canCancel: true, canGenerate: true },
}: Props) {
  const columns: DataTableColumn<RecurringPurchase>[] = [
    {
      id: "service",
      header: "Servicio",
      cell: (item) => (
        <div>
          <div className="font-medium text-black">{item.name}</div>
          {item.description ? (
            <div className="mt-1 text-xs text-black/55">{item.description}</div>
          ) : null}
        </div>
      ),
      searchValue: (item) => `${item.name} ${item.description ?? ""}`,
      cardTitle: true,
      hideable: false,
    },
    {
      id: "frequency",
      header: "Frecuencia",
      cell: (item) => (
        <span className="text-black/70">{frequencyLabels[item.frequency]}</span>
      ),
      sortAccessor: (item) => frequencyLabels[item.frequency],
    },
    {
      id: "amount",
      header: "Monto",
      cell: (item) => (
        <span className="font-medium text-black">{formatMoney(item.amount, item.currency)}</span>
      ),
      sortAccessor: "amount",
    },
    {
      id: "nextDueDate",
      header: "Proximo vencimiento",
      cell: (item) => <span className="text-black/70">{formatDate(item.nextDueDate)}</span>,
      sortAccessor: "nextDueDate",
    },
    {
      id: "status",
      header: "Estado",
      cell: (item) => <RecurringStatusBadge status={item.status} />,
      sortAccessor: (item) => statusLabels[item.status],
    },
    {
      id: "actions",
      header: "Acciones",
      stopRowClick: true,
      hideable: false,
      sortable: false,
      className: "text-center",
      headerClassName: "text-center [&>div]:justify-center",
      cell: (item) => (
        <div className="flex justify-center">
          <ActionsPopover
            actions={buildActions({
              item,
              onPause,
              onResume,
              onCancel,
              onEdit,
              onGenerate,
              onRegisterPayment,
              onViewPayable,
              permissions,
            })}
            columns={1}
            compact
            showLabels
            triggerIcon={<Menu className="h-4 w-4" />}
            popoverClassName="min-w-40"
            popoverBodyClassName="p-2"
            renderAction={(action, helpers) => (
              <button
                key={action.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  helpers.onAction(action);
                }}
                disabled={action.disabled}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03] disabled:pointer-events-none disabled:opacity-50 ${action.className ?? ""}`}
              >
                {action.icon}
                {action.label}
              </button>
            )}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      tableId="recurring-purchases-table"
      data={items}
      columns={columns}
      rowKey="recurringPurchaseTemplateId"
      loading={loading}
      emptyMessage="No hay compras recurrentes registradas."
      hoverable={false}
      animated={false}
      selectableColumns
      toolbarSearchContent={toolbarSearchContent}
      pagination={{ page, limit, total }}
      onPageChange={onPageChange}
    />
  );
}

function RecurringStatusBadge({ status }: { status: RecurringStatus }) {
  const className =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "PAUSED"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-rose-50 text-rose-700 ring-rose-200";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${className}`}>
      {statusLabels[status]}
    </span>
  );
}

function buildActions({
  item,
  onPause,
  onResume,
  onCancel,
  onEdit,
  onGenerate,
  onRegisterPayment,
  onViewPayable,
  permissions,
}: {
  item: RecurringPurchase;
  onPause: (item: RecurringPurchase) => void;
  onResume: (item: RecurringPurchase) => void;
  onCancel: (item: RecurringPurchase) => void;
  onEdit?: (item: RecurringPurchase) => void;
  onGenerate: (item: RecurringPurchase) => void;
  onRegisterPayment: (item: RecurringPurchase) => void;
  onViewPayable?: (item: RecurringPurchase) => void;
  permissions: NonNullable<Props["permissions"]>;
}) {
  return [
    permissions.canEdit && item.status !== "CANCELLED" && onEdit && {
      id: "edit",
      label: "Editar",
      icon: <Pencil className="h-4 w-4 text-black/60" />,
      onClick: () => onEdit(item),
    },
    permissions.canRegisterPayment && item.status === "ACTIVE" && {
      id: "register-payment",
      label: "Registrar pago",
      icon: <Wallet className="h-4 w-4 text-black/60" />,
      onClick: () => onRegisterPayment(item),
    },
    onViewPayable && (item.lastGeneratedPurchaseId || item.lastGeneratedAccountPayableId) && {
      id: "view-payable",
      label: "Ver deuda",
      icon: <Eye className="h-4 w-4 text-black/60" />,
      onClick: () => onViewPayable(item),
    },
    permissions.canGenerate && {
      id: "generate",
      label: "Generar cuenta ahora",
      icon: <RefreshCw className="h-4 w-4 text-black/60" />,
      onClick: () => onGenerate(item),
    },
    permissions.canPause && item.status === "ACTIVE" && {
      id: "pause",
      label: "Pausar",
      icon: <Pause className="h-4 w-4 text-black/60" />,
      onClick: () => onPause(item),
    },
    permissions.canPause && item.status === "PAUSED" && {
      id: "resume",
      label: "Reanudar",
      icon: <Play className="h-4 w-4 text-black/60" />,
      onClick: () => onResume(item),
    },
    permissions.canCancel && item.status !== "CANCELLED" && {
      id: "cancel",
      label: "Cancelar",
      icon: <XCircle className="h-4 w-4" />,
      className: "text-rose-700 hover:bg-rose-50",
      onClick: () => onCancel(item),
    },
  ].filter(Boolean) as ActionItem[];
}
