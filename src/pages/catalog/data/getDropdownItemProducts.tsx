import type { ReactNode } from "react";
import { Boxes, LayoutGrid, Layers, Pencil, Power } from "lucide-react";

type ProductLite = {
  id: string;
  sku?: string | null;
  isActive: boolean;
};

type Handlers = {
  openEquivalences: (productId: string) => void | Promise<void>;
  openRecipes: (productId: string, sku: string) => void;
  openVariantsModal: (productId: string) => void | Promise<void>;
  openEdit: (productId: string) => void | Promise<void>;
  setDeletingProductId: (productId: string) => void;
};

type DropdownItem = {
  label: ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export function getDropdownItemProducts(product: ProductLite, handlers: Handlers): DropdownItem[] {
  return [
    {
      label: (
        <>
          <Layers className="h-4 w-4 text-black/60" />
          Equivalencias
        </>
      ),
      onClick: (e) => {
        e.stopPropagation();
        void handlers.openEquivalences(product.id);
      },
    },
    {
      label: (
        <>
          <LayoutGrid className="h-4 w-4 text-black/60" />
          Recetas
        </>
      ),
      onClick: (e) => {
        e.stopPropagation();
        handlers.openRecipes(product.id, product.sku ?? "-");
      },
    },
    {
      label: (
        <>
          <Boxes className="h-4 w-4 text-black/60" />
          Ver variantes
        </>
      ),
      onClick: (e) => {
        e.stopPropagation();
        void handlers.openVariantsModal(product.id);
      },
    },
    {
      label: (
        <>
          <Pencil className="h-4 w-4 text-black/60" />
          Editar
        </>
      ),
      onClick: (e) => {
        e.stopPropagation();
        void handlers.openEdit(product.id);
      },
    },
    {
      label: (
        <>
          <Power className="h-4 w-4" />
          {product.isActive ? "Eliminar" : "Restaurar"}
        </>
      ),
      className: `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] ${
        product.isActive ? "text-rose-700 hover:bg-rose-50" : "text-cyan-700 hover:bg-cyan-50"
      }`,
      onClick: (e) => {
        e.stopPropagation();
        handlers.setDeletingProductId(product.id);
      },
    },
  ];
}
