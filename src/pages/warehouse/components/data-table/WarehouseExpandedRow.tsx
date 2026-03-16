import type { VisibilityState } from "@tanstack/react-table";
import type { Warehouse } from "@/pages/warehouse/types/warehouse";
import { ExpandedHiddenFields } from "@/components/data-table/expanded-hidden-fields/ExpandedHiddenFields";
import { warehouseExpandedFields } from "./warehouseExpandedFields";

type Props = {
  warehouse: Warehouse;
  columnVisibility: VisibilityState;
};

export function WarehouseExpandedRow({ warehouse, columnVisibility }: Props) {
  return (
    <ExpandedHiddenFields
      row={warehouse}
      fields={warehouseExpandedFields}
      columnVisibility={columnVisibility}
    />
  );
}
