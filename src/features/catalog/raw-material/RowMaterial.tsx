import { ProductCatalogPage } from "@/features/catalog/components/ProductCatalogPage";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import { listCatalogMaterials } from "@/shared/services/productService";

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
        deleteMessage: "Estas por eliminar logicamente una materia prima. Ya no se mostrara en el catalogo, pero se conservara en la base de datos.",
        deactivateMessage: "Estas por desactivar una materia prima. Podras activarla nuevamente despues.",
        activateMessage: "Estas por activar nuevamente esta materia prima.",
        restoreMessage: "Estas por restaurar una materia prima. Hazlo solo si estas seguro.",
      }}
    />
  );
}
