import { Plus } from "lucide-react";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingDateTimePicker } from "@/shared/components/components/date-picker/FloatingDateTimePicker";
import { SystemButton } from "@/shared/components/components/SystemButton";
import type {
  CurrencyType,
  VoucherDocType,
} from "@/features/purchases/types/purchaseEnums";
import type { PurchaseOrder } from "@/features/purchases/types/purchase";

type SelectOption = {
  value: string;
  label: string;
};

type SupplierOption = SelectOption & {
  days?: number | null;
};

type Props = {
  form: PurchaseOrder;
  primaryColor: string;
  documentTypeOptions: SelectOption[];
  currencyOptions: SelectOption[];
  warehouseOptions: SelectOption[];
  supplierOptions: SupplierOption[];
  itemCount: number;
  totalValueLabel: string;
  totalPriceLabel: string;
  isAddPaymentDisabled: boolean;
  parseDateValue: (value?: string | null) => Date | null;
  onDocumentTypeChange: (value: VoucherDocType) => void;
  onCurrencyChange: (value: CurrencyType) => void;
  onSerieChange: (value: string) => void;
  onCorrelativeChange: (value: number) => void;
  onWarehouseChange: (value: string) => void;
  onSupplierChange: (value: string) => void;
  onSupplierSearchChange: (text: string) => void;
  onIssueDateChange: (date: Date | null) => void;
  onExpectedAtChange: (date: Date | null) => void;
  onOpenCreateWarehouse: () => void;
  onOpenCreateSupplier: () => void;
  onOpenPaymentModal: () => void;
};

export function PurchaseDetailsSidebar({
  form,
  primaryColor,
  documentTypeOptions,
  currencyOptions,
  warehouseOptions,
  supplierOptions,
  itemCount,
  totalValueLabel,
  totalPriceLabel,
  isAddPaymentDisabled,
  parseDateValue,
  onDocumentTypeChange,
  onCurrencyChange,
  onSerieChange,
  onCorrelativeChange,
  onWarehouseChange,
  onSupplierChange,
  onSupplierSearchChange,
  onIssueDateChange,
  onExpectedAtChange,
  onOpenCreateWarehouse,
  onOpenCreateSupplier,
  onOpenPaymentModal,
}: Props) {
  return (
    <aside className="flex flex-col overflow-hidden border-0 border-black/10 lg:border-l">
      <div className="flex-1 space-y-5 overflow-auto p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-3">
          <FloatingSelect
            label="Tipo"
            name="document-type"
            value={form.documentType}
            onChange={(value) => onDocumentTypeChange(value as VoucherDocType)}
            options={documentTypeOptions}
          />

          <FloatingSelect
            label="Moneda"
            name="currency"
            value={form.currency}
            onChange={(value) => onCurrencyChange(value as CurrencyType)}
            options={currencyOptions}
            disabled
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FloatingInput
            label="Serie"
            name="serie"
            value={form.serie}
            onChange={(event) => onSerieChange(event.target.value)}
          />

          <FloatingInput
            label="Numero"
            name="correlative"
            type="number"
            value={form.correlative ? String(form.correlative) : ""}
            onChange={(event) => onCorrelativeChange(Number(event.target.value || 0))}
          />
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <FloatingSelect
              label="Almacen"
              name="warehouse"
              value={form.warehouseId}
              onChange={onWarehouseChange}
              options={warehouseOptions}
              searchable
              searchPlaceholder="Buscar almacen..."
              emptyMessage="Sin almacenes"
            />

            <SystemButton
              size="icon"
              className="h-10 w-10"
              style={{
                backgroundColor: primaryColor,
                borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
              }}
              title="Agregar almacen"
              onClick={onOpenCreateWarehouse}
            >
              <Plus className="h-4 w-4" />
            </SystemButton>
          </div>
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <FloatingSelect
              label="Proveedor"
              name="supplier"
              value={form.supplierId}
              onChange={onSupplierChange}
              options={supplierOptions}
              searchable
              searchPlaceholder="Buscar proveedor..."
              emptyMessage="Sin proveedores"
              onSearchChange={onSupplierSearchChange}
            />

            <SystemButton
              size="icon"
              className="h-10 w-10"
              style={{
                backgroundColor: primaryColor,
                borderColor: `color-mix(in srgb, ${primaryColor} 20%, transparent)`,
              }}
              title="Agregar proveedor"
              onClick={onOpenCreateSupplier}
            >
              <Plus className="h-4 w-4" />
            </SystemButton>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FloatingDateTimePicker
            label="Fecha de emision"
            name="date-issue"
            value={parseDateValue(form.dateIssue)}
            onChange={onIssueDateChange}
            clearable={false}
          />

          <FloatingDateTimePicker
            label=" a almacen"
            name="expected-at"
            value={parseDateValue(form.expectedAt)}
            onChange={onExpectedAtChange}
          />
        </div>

        <div className="mt-2 rounded-sm border border-black/10 bg-black/[0.02] p-3">
          <p className="text-xs font-semibold text-black">Resumen</p>
          <div className="mt-2 space-y-1 text-[11px] text-black/70">
            <div className="flex items-center justify-between">
              <span>Items</span>
              <span className="tabular-nums font-semibold">{itemCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total valor</span>
              <span className="tabular-nums font-semibold">{totalValueLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total precio</span>
              <span className="tabular-nums font-semibold">{totalPriceLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="flex gap-2">
          <SystemButton
            className="flex-1"
            disabled={isAddPaymentDisabled}
            onClick={onOpenPaymentModal}
          >
            Agregar Pago
          </SystemButton>
        </div>
      </div>
    </aside>
  );
}
