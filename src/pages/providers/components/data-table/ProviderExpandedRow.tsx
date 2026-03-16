import type { VisibilityState } from "@tanstack/react-table";
import type { Supplier } from "@/pages/providers/types/supplier";
import { ExpandedHiddenFields } from "@/components/data-table/expanded-hidden-fields/ExpandedHiddenFields";
import { providerExpandedFields } from "./providerExpandedFields";

type Props = {
  supplier: Supplier;
  columnVisibility: VisibilityState;
};

export function ProviderExpandedRow({ supplier, columnVisibility }: Props) {
  return (
    <ExpandedHiddenFields
      row={supplier}
      fields={providerExpandedFields}
      columnVisibility={columnVisibility}
    />
  );
}