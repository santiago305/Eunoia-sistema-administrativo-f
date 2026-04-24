import { ProductCatalogPage } from "@/pages/catalog/components/ProductCatalogPage";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import { listCatalogProducts } from "@/services/productService";

export default function CatalogProducts() {
  return (
    <ProductCatalogPage
      config={{
        productType: ProductTypes.PRODUCT,
        mode: "product",
        listAll: listCatalogProducts,
        pageTitle: "Catalogo - Productos",
        headingTitle: "Productos",
        tableId: "catalog-products",
        searchLabel: "Buscar productos...",
        searchName: "catalog-products-smart-search",
        emptyMessage: "No hay productos disponibles.",
        createTitle: "Nuevo producto",
        createLabel: "Nuevo producto",
        entityLabel: "producto",
        csvFileName: "productos.csv",
        updateSuccessMessage: "Estado de producto actualizado",
        updateErrorMessage: "Error al cambiar estado del producto",
        deleteMessage: "Estas por eliminar un producto. Hazlo solo si estas seguro.",
        restoreMessage: "Estas por restaurar un producto. Hazlo solo si estas seguro.",
      }}
    />
  );
}
