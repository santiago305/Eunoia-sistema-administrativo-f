import { ChevronDown, ChevronRight, Menu, Pencil, Power, Timer } from "lucide-react";
import { createColumnHelper, type ColumnDef, type VisibilityState } from "@tanstack/react-table";
import { StatusPill } from "@/components/StatusTag";
import { Dropdown } from "@/components/Dropdown";
import { IconPaymentMethod } from "@/components/dashboard/icons";
import type { Supplier } from "@/pages/providers/types/supplier";
import { providerExpandedFields } from "./providerExpandedFields";
import { hasHiddenExpandableFields } from "@/components/data-table/expanded-hidden-fields/hasHiddenExpandableFields";

const columnHelper = createColumnHelper<Supplier>();

type ProvidersColumnsParams = {
    primaryColor: string;
    columnVisibility: VisibilityState;
    getSupplierDisplayName: (supplier: Supplier) => string;
    onEdit: (supplierId: string) => void;
    onOpenMethods: (supplierId: string) => void;
    onToggleActive: (supplier: Supplier) => void;
};

export function getProvidersColumns({ primaryColor, columnVisibility, getSupplierDisplayName, onEdit, onOpenMethods, onToggleActive }: ProvidersColumnsParams): ColumnDef<Supplier, any>[] {
    const canExpandRows = hasHiddenExpandableFields(providerExpandedFields, columnVisibility);

    return [
        ...(canExpandRows
            ? [
                  columnHelper.display({
                      id: "expander",
                      header: "",
                      size: 10,
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

        columnHelper.accessor("documentNumber", {
            id: "documentNumber",
            header: "ID",
            cell: (info) => <div className="text-black/60 text-xs">{info.getValue() || "-"}</div>,
        }),

        columnHelper.display({
            id: "supplier",
            header: "Proveedor",
            cell: ({ row }) => <div className="text-black/70">{getSupplierDisplayName(row.original)}</div>,
        }),

        columnHelper.accessor("email", {
            id: "email",
            header: "Email",
            cell: (info) => <div className="text-black/70">{info.getValue() || "-"}</div>,
        }),

        columnHelper.accessor("phone", {
            id: "phone",
            header: "Telefono",
            cell: (info) => <div className="text-black/70">{info.getValue() || "-"}</div>,
        }),

        columnHelper.accessor("tradeName", {
            id: "tradeName",
            header: "Nombre comercial",
            cell: (info) => <div className="text-black/70">{info.getValue() || "-"}</div>,
        }),

        columnHelper.accessor("address", {
            id: "address",
            header: "Direccion",
            cell: (info) => <div className="text-black/70">{info.getValue() || "-"}</div>,
        }),

        columnHelper.accessor("leadTimeDays", {
            id: "leadTimeDays",
            header: "T. Espera",
            cell: (info) => (
                <div className="flex items-center justify-center gap-2 text-black/70">
                    {info.getValue() ?? "-"}
                    <Timer className="h-4 w-4" />
                </div>
            ),
        }),

        columnHelper.accessor("note", {
            id: "note",
            header: "Nota",
            cell: (info) => <div className="truncate text-black/70">{info.getValue() || "-"}</div>,
        }),

        columnHelper.accessor("isActive", {
            id: "isActive",
            header: "Estado",
            cell: (info) => <StatusPill active={info.getValue()} PRIMARY={primaryColor} />,
        }),

        columnHelper.display({
            id: "actions",
            header: "",
            cell: ({ row }) => {
                const supplier = row.original;

                return (
                    <div className="flex items-center justify-end gap-2">
                        <Dropdown
                            trigger={<Menu className="h-4 w-4" />}
                            menuClassName="min-w-52 p-2"
                            itemClassName="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03]"
                            items={[
                                {
                                    label: (
                                        <>
                                            <Pencil className="h-4 w-4 text-black/60" />
                                            Editar
                                        </>
                                    ),
                                    onClick: (e: any) => {
                                        e.stopPropagation();
                                        onEdit(supplier.supplierId);
                                    },
                                },
                                {
                                    label: (
                                        <>
                                            <IconPaymentMethod />
                                            Metodos de pago
                                        </>
                                    ),
                                    onClick: (e: any) => {
                                        e.stopPropagation();
                                        onOpenMethods(supplier.supplierId);
                                    },
                                },
                                {
                                    label: (
                                        <>
                                            <Power className="h-4 w-4" />
                                            {supplier.isActive ? "Eliminar" : "Restaurar"}
                                        </>
                                    ),
                                    className: `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] ${
                                        supplier.isActive ? "text-rose-700 hover:bg-rose-50" : "text-cyan-700 hover:bg-cyan-50"
                                    }`,
                                    onClick: (e: any) => {
                                        e.stopPropagation();
                                        onToggleActive(supplier);
                                    },
                                },
                            ]}
                        />
                    </div>
                );
            },
        }),
    ];
}
