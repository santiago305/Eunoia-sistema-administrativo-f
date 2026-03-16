import type { VisibilityState } from "@tanstack/react-table";
import type { ProductionOrder } from "@/pages/production/types/production";
import { ExpandedHiddenFields } from "@/components/data-table/expanded-hidden-fields/ExpandedHiddenFields";
import { productionExpandedFields } from "./productionExpandedFields";

type Props = {
  order: ProductionOrder;
  columnVisibility: VisibilityState;
};

export function ProductionExpandedRow({ order, columnVisibility }: Props) {
  return (
    <ExpandedHiddenFields
      row={order}
      fields={productionExpandedFields}
      columnVisibility={columnVisibility}
    />
  );
}
