import { Boxes, ChevronDown, ChevronRight, Menu, Pencil, Power } from "lucide-react";
import { createColumnHelper, type ColumnDef, type VisibilityState } from "@tanstack/react-table";
import { StatusPill } from "@/components/StatusTag";
import { Dropdown } from "@/pages/purchases/components/PurchaseDropdown";
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

export function getWarehouseColumns({
  primaryColor,
  columnVisibility,
  formatDate,
  onEdit,
  onOpenLocations,
  onToggleActive,
}: WarehouseColumnsParams): ColumnDef<Warehouse, any>[] {
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
                {row.getIsExpanded() ? (
                  <ChevronDown className="h-4 w-4 text-black/60" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-black/60" />
                )}
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
            <Dropdown
              trigger={<Menu className="h-4 w-4" />}
              menuClassName="min-w-52 p-2"
              itemClassName="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-black/80 hover:bg-black/[0.03]"
              items={[
                {
                  label: (
                    <>
                      <Boxes className="h-4 w-4 text-black/60" />
                      Ver ubicaciones
                    </>
                  ),
                  onClick: (e: any) => {
                    e.stopPropagation();
                    onOpenLocations({ warehouseId: w.warehouseId, name: w.name });
                  },
                },
                {
                  label: (
                    <>
                      <Pencil className="h-4 w-4 text-black/60" />
                      Editar
                    </>
                  ),
                  onClick: (e: any) => {
                    e.stopPropagation();
                    onEdit(w.warehouseId);
                  },
                },
                {
                  label: (
                    <>
                      <Power className="h-4 w-4" />
                      {w.isActive ? "Eliminar" : "Restaurar"}
                    </>
                  ),
                  className: `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] ${
                    w.isActive ? "text-rose-700 hover:bg-rose-50" : "text-cyan-700 hover:bg-cyan-50"
                  }`,
                  onClick: (e: any) => {
                    e.stopPropagation();
                    onToggleActive(w.warehouseId);
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
