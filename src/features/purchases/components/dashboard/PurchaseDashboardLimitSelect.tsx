import { FloatingSelect } from "@/shared/components/components/FloatingSelect";

export const PURCHASE_DASHBOARD_LIMIT_OPTIONS = [10, 20, 50] as const;
export type PurchaseDashboardLimit = (typeof PURCHASE_DASHBOARD_LIMIT_OPTIONS)[number];
export const DEFAULT_PURCHASE_DASHBOARD_LIMIT: PurchaseDashboardLimit = 10;

type Props = {
  value?: number;
  onChange: (value: PurchaseDashboardLimit) => void;
  disabled?: boolean;
};

const options = PURCHASE_DASHBOARD_LIMIT_OPTIONS.map((value) => ({
  value: String(value),
  label: `${value} filas`,
}));

export function PurchaseDashboardLimitSelect({ value, onChange, disabled }: Props) {
  const current = PURCHASE_DASHBOARD_LIMIT_OPTIONS.includes(value as PurchaseDashboardLimit)
    ? value
    : DEFAULT_PURCHASE_DASHBOARD_LIMIT;

  return (
    <FloatingSelect
      label="Filas por cuadro"
      name="purchase-dashboard-limit"
      value={String(current)}
      onChange={(next) => onChange(Number(next) as PurchaseDashboardLimit)}
      options={options}
      disabled={disabled}
    />
  );
}
