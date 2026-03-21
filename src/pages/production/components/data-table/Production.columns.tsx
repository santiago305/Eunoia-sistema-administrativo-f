import { ChevronDown, ChevronRight, Menu, OctagonAlert, Timer } from "lucide-react";
import { createColumnHelper, type ColumnDef, type VisibilityState } from "@tanstack/react-table";
import { Dropdown } from "@/components/Dropdown";
import type { ProductionOrder, ProductionStatus } from "@/pages/production/types/production";
import TimerToEnd, { formatDate } from "@/component/TimerToEnd";
import { productionExpandedFields } from "./productionExpandedFields";
import { hasHiddenExpandableFields } from "@/components/data-table/expanded-hidden-fields/hasHiddenExpandableFields";

const columnHelper = createColumnHelper<ProductionOrder>();

type ProductionColumnsParams = {
    columnVisibility: VisibilityState;
    nowIso: string;
    statusLabels: Record<ProductionStatus, string>;
    onStart: (id: string) => void;
    onClose: (id: string) => void;
    onCancel: (id: string) => void;
    onEdit: (id: string) => void;
    onPdf: (id: string) => void;
    loadOrders: () => void;
};

export function getProductionColumns({ columnVisibility, nowIso, statusLabels, onStart, onClose, onCancel, onEdit, onPdf, loadOrders }: ProductionColumnsParams): ColumnDef<ProductionOrder, any>[] {
    const canExpandRows = hasHiddenExpandableFields(productionExpandedFields, columnVisibility);

    return [
        ...(canExpandRows
            ? [
                  columnHelper.display({
                      id: "expander",
                      header: "",
                      size: 48,
                      cell: ({ row }) => (
                          <button
                              type="button"
                              onClick={row.getToggleExpandedHandler()}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border 
                border-black/10 hover:bg-black/[0.03]"
                          >
                              {row.getIsExpanded() ? <ChevronDown className="h-4 w-4 text-black/60" /> : <ChevronRight className="h-4 w-4 text-black/60" />}
                          </button>
                      ),
                  }),
              ]
            : []),

        columnHelper.display({
            id: "registro",
            header: "Registro",
            cell: ({ row }) => {
                const value = row.original.manufactureDate ?? "";
                const dateCreated = formatDate(new Date(value || "-"));
                const timeCreated = value
                    ? new Date(value).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                      })
                    : undefined;
                return (
                    <div className="text-black/70">
                        {dateCreated}
                        <br />
                        {timeCreated}
                    </div>
                );
            },
        }),

        columnHelper.display({
            id: "serie",
            header: "Serie",
            cell: ({ row }) => <div className="text-black/70">{row.original.serie?.code ? `${row.original.serie?.code} - ${row.original.correlative}` : ""}</div>,
        }),

        columnHelper.accessor("reference", {
            id: "reference",
            header: "Referencia",
            cell: (info) => <div className="text-black/70">{info.getValue() || "-"}</div>,
        }),

        columnHelper.display({
            id: "fromWarehouse",
            header: "Almacen origen",
            cell: ({ row }) => <div className="text-black/70">{row.original.fromWarehouse?.name ?? "-"}</div>,
        }),

        columnHelper.display({
            id: "toWarehouse",
            header: "Almacen destino",
            cell: ({ row }) => <div className="text-black/70">{row.original.toWarehouse?.name ?? "-"}</div>,
        }),

        columnHelper.accessor("status", {
            id: "status",
            header: "Estado",
            cell: (info) => {
                const status = info.getValue() as ProductionStatus | undefined;
                const label = status ? statusLabels[status] : "-";
                return <span className="inline-flex rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700">{label}</span>;
            },
        }),

        columnHelper.display({
            id: "productionTime",
            header: "T. Produccion",
            cell: ({ row }) => {
                const status = row.original.status;
                return (
                    <div className="flex h-full items-center justify-center">
                        {status === "IN_PROGRESS" && (
                            <span
                                className="inline-flex rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium 
              text-slate-700"
                            >
                                <TimerToEnd from={nowIso} to={row.original.manufactureDate ?? ""} loadProductionOrders={loadOrders} />
                            </span>
                        )}
                        {status === "PARTIAL" && (
                            <span
                                className="flex flex-col items-center rounded-lg bg-slate-50 px-2 py-1 text-[10px] 
              font-medium text-slate-700"
                            >
                                <OctagonAlert className="h-4 w-4" />
                                <span className="mt-1">Por Ing.</span>
                            </span>
                        )}
                        {status === "COMPLETED" && (
                            <span className="flex flex-col items-center rounded-lg bg-slate-50 p-1 text-[10px] font-medium text-slate-700">
                                <Timer className="h-4 w-4" />
                                <span className="mt-1">Completado</span>
                            </span>
                        )}
                    </div>
                );
            },
        }),

        columnHelper.display({
            id: "termino",
            header: "Termino",
            cell: ({ row }) => {
                const value = row.original.manufactureDate ?? "";
                const dateEnd = formatDate(new Date(value || "-"));
                const timeEnd = value
                    ? new Date(value).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                      })
                    : undefined;
                return (
                    <div className="text-black/70">
                        {dateEnd}
                        <br />
                        {timeEnd}
                    </div>
                );
            },
        }),

        columnHelper.display({
            id: "actions",
            header: "",
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <Dropdown
                        trigger={<Menu className="h-4 w-4" />}
                        itemClassName="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-black/70 hover:bg-black/[0.04]"
                        items={[
                            order.status === "DRAFT" && {
                                label: "Procesar",
                                onClick: () => onStart(order.productionId ?? ""),
                            },
                            order.status === "DRAFT" && {
                                label: "Editar",
                                onClick: () => onEdit(order.productionId ?? ""),
                            },
                            {
                                label: "Abrir pdf",
                                onClick: () => onPdf(order.productionId ?? ""),
                            },
                            order.status === "DRAFT" && {
                                label: "Cancelar",
                                className: "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-rose-700 hover:bg-rose-50",
                                onClick: () => onCancel(order.productionId ?? ""),
                            },
                            (order.status === "IN_PROGRESS" || order.status === "PARTIAL") && {
                                label: "Ingresar a elmacen",
                                onClick: () => onClose(order.productionId ?? ""),
                            },
                        ].filter(Boolean)}
                    />
                );
            },
        }),
    ];
}
