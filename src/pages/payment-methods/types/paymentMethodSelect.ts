import type { ReactNode } from "react";

export type PaymentMethodSelectOption = {
  value: string;
  label: string;
};

export type PaymentMethodSelectComposedProps = {
  value: string;
  onChange: (value: string) => void;
  options: PaymentMethodSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  textSize?: string;
  onCreate?: () => void;
  onEdit?: (value: string) => void;
  disabled?: boolean;
  emptyLabel?: string;
  renderOptionExtra?: (value: string) => ReactNode;
};
