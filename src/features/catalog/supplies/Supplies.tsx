import { ProductCatalogPage } from "@/features/catalog/components/ProductCatalogPage";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import { listCatalogSupplies } from "@/shared/services/productService";

export default function Supplies() {
  return <ProductCatalogPage config={{ productType: ProductTypes.SUPPLY, mode: "supply", listAll: listCatalogSupplies, pageTitle: "Insumos", headingTitle: "Insumos", tableId: "supply-products", searchLabel: "Buscar insumos...", searchName: "supply-products-smart-search", emptyMessage: "No hay insumos disponibles.", createTitle: "Nuevo insumo", createLabel: "Nuevo insumo", entityLabel: "insumo", csvFileName: "insumos.csv", updateSuccessMessage: "Estado de insumo actualizado", updateErrorMessage: "Error al cambiar el estado del insumo", deleteMessage: "Estas por eliminar logicamente un insumo. Ya no se mostrara en el catalogo, pero se conservara en la base de datos.", deactivateMessage: "Estas por desactivar un insumo. Podras activarlo nuevamente despues.", activateMessage: "Estas por activar nuevamente este insumo.", restoreMessage: "Estas por restaurar un insumo. Hazlo solo si estas seguro." }} />;
}
