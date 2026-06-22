import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import {
  PurchaseItemTypes,
  purchaseItemTypeLabels,
  type PurchaseItemType,
} from "@/features/purchases/types/purchase-classification.types";

type Props = {
  value: PurchaseItemType;
  onChange: (value: PurchaseItemType) => void;
};

const options = Object.values(PurchaseItemTypes).map((value) => ({
  value,
  label: purchaseItemTypeLabels[value],
}));

export function PurchaseItemTypeSelect({ value, onChange }: Props) {
  return (
    <FloatingSelect
      label="Tipo de item"
      name="purchase-item-type"
      value={value}
      onChange={(next) => onChange(next as PurchaseItemType)}
      options={options}
    />
  );
}
