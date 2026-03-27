import { Boxes, ChevronDown, ChevronRight, Menu, Pencil, Power } from "lucide-react";
import { createColumnHelper, type ColumnDef, type VisibilityState } from "@tanstack/react-table";
import { StatusPill } from "@/components/StatusTag";
import { ActionsPopover } from "@/components/ActionsPopover";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import { warehouseExpandedFields } from "./warehouseExpandedFields";
import { hasHiddenExpandableFields } from "@/components/data-table/expanded-hidden-fields/hasHiddenExpandableFields";

const columnHelper = createColumnHelper<Warehouse>();

type WarehouseColumnsParams = {
    primaryColor: string;
    columnVisibility: VisibilityState;
    formatDate: (value: string) => string;
    onEdit: (warehouseId: string) => void;
    onOpenLocations: (warehouse: { warehouseId: string; name: string }) => void;
    onToggleActive: (warehouseId: string) => void;
};

export function getWarehouseColumns({ primaryColor, columnVisibility, formatDate, onEdit, onOpenLocations, onToggleActive }: WarehouseColumnsParams): ColumnDef<Warehouse, any>[] {
    const canExpandRows = hasHiddenExpandableFields(warehouseExpandedFields, columnVisibility);

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
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/10 hover:bg-black/[0.03]"
                          >
                              {row.getIsExpanded() ? <ChevronDown className="h-4 w-4 text-black/60" /> : <ChevronRight className="h-4 w-4 text-black/60" />}
                          </button>
                      ),
                  }),
              ]
            : []),

        columnHelper.accessor("name", {
            id: "name",
            header: "Almacen",
            cell: (info) => <div className="text-black/70">{info.getValue() || "-"}</div>,
        }),

        columnHelper.accessor("department", {
            id: "department",
            header: "Departamento",
            cell: (info) => <div className="text-black/70">{info.getValue() || "-"}</div>,
        }),

        columnHelper.accessor("province", {
            id: "province",
            header: "Provincia",
            cell: (info) => <div className="text-black/70">{info.getValue() || "-"}</div>,
        }),

        columnHelper.accessor("district", {
            id: "district",
            header: "Distrito",
            cell: (info) => <div className="text-black/70">{info.getValue() || "-"}</div>,
        }),

        columnHelper.accessor("address", {
            id: "address",
            header: "Direccion",
            cell: (info) => <div className="text-black/70">{info.getValue() || "-"}</div>,
        }),

        columnHelper.accessor("isActive", {
            id: "isActive",
            header: "Estado",
            cell: (info) => <StatusPill active={info.getValue()} PRIMARY={primaryColor} />,
        }),

        columnHelper.accessor("createdAt", {
            id: "createdAt",
            header: "Creado",
            cell: (info) => <div className="text-black/60 text-xs">{formatDate(info.getValue())}</div>,
        }),
        columnHelper.display({
            id: "actions",
            header: "",
            cell: ({ row }) => {
                const w = row.original;

                return (
                    <div className="flex items-center justify-end">
                        <ActionsPopover
                            actions={[
                                {
                                    id: "locations",
                                    label: "Ver ubicaciones",
                                    icon: <Boxes className="h-4 w-4" />,
                                    onClick: () => onOpenLocations({ warehouseId: w.warehouseId, name: w.name }),
                                },
                                {
                                    id: "edit",
                                    label: "Editar",
                                    icon: <Pencil className="h-4 w-4" />,
                                    onClick: () => onEdit(w.warehouseId),
                                },
                                {
                                    id: "toggle",
                                    label: w.isActive ? "Eliminar" : "Restaurar",
                                    icon: <Power className="h-4 w-4" />,
                                    danger: w.isActive,
                                    onClick: () => onToggleActive(w.warehouseId),
                                },
                            ]}
                            columns={1}
                            triggerIcon={<Menu className="h-4 w-4" />}
                            triggerVariant="ghost"
                            compact
                            popoverClassName="min-w-52 p-2"
                            itemClassName="justify-start px-3 py-2 text-[11px]"
                        />
                    </div>
                );
            },
        }),
    ];
}
