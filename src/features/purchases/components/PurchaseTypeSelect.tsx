import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import {
  PurchaseTypes,
  purchaseTypeLabels,
  type PurchaseType,
} from "@/features/purchases/types/purchase-classification.types";

type Props = {
  value: PurchaseType;
  onChange: (value: PurchaseType) => void;
};

const options = Object.values(PurchaseTypes).map((value) => ({
  value,
  label: purchaseTypeLabels[value],
}));

export function PurchaseTypeSelect({ value, onChange }: Props) {
  return (
    <FloatingSelect
      label="Tipo de compra"
      name="purchase-type"
      value={value}
      onChange={(next) => onChange(next as PurchaseType)}
      options={options}
    />
  );
}
