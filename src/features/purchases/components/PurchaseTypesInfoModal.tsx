import { AlertCircle, Box, BriefcaseBusiness, Hammer, Layers3, Package, PackageOpen, Repeat } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import {
  PurchaseTypes,
  purchaseTypeDescriptions,
  purchaseTypeLabels,
  type PurchaseType,
} from "@/features/purchases/types/purchase-classification.types";

type PurchaseTypesInfoModalProps = {
  open: boolean;
  onClose: () => void;
};

const purchaseTypeIcons: Record<PurchaseType, typeof Package> = {
  INVENTORY: Package,
  RAW_MATERIAL: PackageOpen,
  INTERNAL_MATERIAL: Box,
  FIXED_ASSET: BriefcaseBusiness,
  SERVICE: Hammer,
  SUBSCRIPTION: Repeat,
  MIXED: Layers3,
};

const orderedPurchaseTypes = Object.values(PurchaseTypes);

export function PurchaseTypesInfoModal({ open, onClose }: PurchaseTypesInfoModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tipos de compra"
      description="Guia rapida para elegir correctamente el tipo de compra antes de registrar una orden."
      className="w-full max-w-4xl"
      bodyClassName="p-4 sm:p-5"
    >

      <div className="grid gap-3 md:grid-cols-2">
        {orderedPurchaseTypes.map((purchaseType) => {
          const Icon = purchaseTypeIcons[purchaseType];
          const description = purchaseTypeDescriptions[purchaseType];

          return (
            <article
              key={purchaseType}
              className="rounded-lg border border-black/10 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-2">
                  <div>
                    <h3 className="text-sm font-semibold text-black">{purchaseTypeLabels[purchaseType]}</h3>
                    <p className="text-xs font-medium text-black/55">{description.summary}</p>
                  </div>
                  <p className="text-sm leading-5 text-black/70">{description.detail}</p>
                  <p className="rounded-md bg-black/[0.03] px-3 py-2 text-xs leading-5 text-black/60">
                    {description.example}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Modal>
  );
}
