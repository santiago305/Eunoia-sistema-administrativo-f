import { ProductCatalogPage } from "@/pages/catalog/components/ProductCatalogPage";
import { ProductTypes } from "@/pages/catalog/types/ProductTypes";
import { listCatalogMaterials } from "@/services/productService";

export default function RowMaterial() {
  return (
    <ProductCatalogPage
      config={{
        productType: ProductTypes.MATERIAL,
        mode: "material",
        listAll: listCatalogMaterials,
        pageTitle: "Suministros - Materias primas",
        headingTitle: "Materiales",
        tableId: "row-material-products",
        searchLabel: "Buscar materiales...",
        searchName: "row-material-products-smart-search",
        emptyMessage: "No hay materiales disponibles.",
        createTitle: "Nueva materia prima",
        createLabel: "Nueva materia prima",
        entityLabel: "materia prima",
        csvFileName: "materiales.csv",
        updateSuccessMessage: "Estado de material actualizado",
        updateErrorMessage: "Error al cambiar estado del material",
        deleteMessage: "Estas por eliminar una materia prima. Hazlo solo si estas seguro.",
        restoreMessage: "Estas por restaurar una materia prima. Hazlo solo si estas seguro.",
      }}
    />
  );
}
