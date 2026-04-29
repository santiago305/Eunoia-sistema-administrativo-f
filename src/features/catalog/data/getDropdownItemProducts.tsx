import type { ActionItem } from "@/shared/components/components/ActionsPopover";
import type { Product } from "@/features/catalog/types/product";
import { Pencil, Trash2 } from "lucide-react";

type Handlers = {
  openEquivalences?: (productId: string) => void | Promise<void>;
  openRecipes?: (productId: string, sku: string) => void;
  openVariantsModal?: (productId: string) => void | Promise<void>;
  openEdit?: (product: Product) => void | Promise<void>;
  setDeletingProductId?: (productId: string) => void;
};

export function getDropdownItemProducts(product: Product, handlers: Handlers): ActionItem[] {
  return [
    {
      id: "edit",
      label: "Editar",
      icon: <Pencil className="h-4 w-4 text-black/60" />,
      onClick: () => {
        void handlers.openEdit?.(product);
      },
    },
    {
      id: "toggle",
      label: product.isActive ? "Eliminar" : "Restaurar",
      icon: <Trash2 className="h-4 w-4" />,
      danger: product.isActive,
      className: product.isActive ? "text-rose-700 hover:bg-rose-50" : "text-cyan-700 hover:bg-cyan-50",
      onClick: () => {
        handlers.setDeletingProductId?.(product.id);
      },
    },
  ];
}
