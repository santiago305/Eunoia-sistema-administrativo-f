# Diseño: Listar y agregar SKUs (catálogo) en `SaleOrderItemEditorModal`

Fecha: 2026-05-29

## Objetivo

En la modal `src/features/sale-orders/components/SaleOrderItemEditorModal.tsx`, permitir:

1) **Buscar/listar SKUs de productos del catálogo** (guiado por el patrón de Out Orders).
2) **Agregar un SKU seleccionado** como componente (`value.components`) del item de la orden de venta.

## Contexto actual

- `SaleOrderItemEditorModal` ya muestra “Productos” (`componentRows`) cuando hay pack (`referencePackId`) y/o componentes.
- El botón `+` en “Productos” abre un modal stub (`openAddSku`) sin contenido real.
- `OutOrder` implementa búsqueda de SKUs usando `listSkus` y un `FloatingSelect` searchable.
- El catálogo expone `price` por SKU:
  - `ProductCatalogSku.price?: number` (ver `src/features/catalog/types/product.ts`).
  - El editor de packs (`src/features/catalog/packs/components/PackItemsEditor.tsx`) ya usa `listSkus` y mapea `price: Number(item.sku.price ?? 0)`.

## Alcance (In / Out)

**In**
- Modal “Agregar SKU” con búsqueda server-side (`listSkus`) y opciones con label + price.
- Al confirmar “Agregar”, insertar/actualizar el SKU en `value.components` con `upsertComponent`.
- Recalcular `value.total` y `value.unitPrice` desde componentes (usando `recalcParentFromComponents`).
- Si el SKU agregado estaba en `excludedSkuIds` (lo “eliminaste” del pack), removerlo de `excludedSkuIds` para que vuelva a ser visible.

**Out**
- No se modifica backend ni contratos de API.
- No se rediseña el flujo general de creación de Sale Orders.
- No se permite “múltiples líneas” del mismo `skuId` (se hace upsert por `skuId`).

## UX propuesto

### Botón `+` (Productos)
- Habilitado solo si hay pack seleccionado (`value.referencePackId`).
  - Razón: el cálculo actual distribuye cantidades solo cuando `hasPack` es true; permitir componentes sin pack requeriría ampliar reglas de cálculo.
- Si no hay pack: botón deshabilitado con tooltip/mensaje (“Selecciona un pack para agregar SKUs”).

### Modal “Agregar SKU”
Controles:
- `FloatingSelect` searchable:
  - Fuente: `listSkus({ q, productType: ProductTypes.PRODUCT, isActive: true, page: 1, limit: 10 })`
  - Label: mismo formato que OutOrder / PackItemsEditor: `name + attrs + backendSku/customSku`.
  - Además, cada opción conserva `price` del contrato (`item.sku.price`).
- Inputs:
  - `Cantidad` (default `1`, validación > 0)
  - `Precio unit.` (default `selectedSku.price` si viene; si no, `0`, validación >= 0)
  - `Total` se calcula como `cantidad * precio` (editable opcional; si se edita, recalcula unitPrice).

Acciones:
- **Cancelar**: cierra modal y limpia estado.
- **Agregar**:
  - Construye `SaleOrderItemComponentInput`:
    - `skuId = selectedSkuId`
    - `quantity = parsedQuantity`
    - `unitPrice = parsedUnitPrice` (prefill desde catálogo)
    - `total = quantity * unitPrice`
    - `referencePackItemId = undefined` (no pertenece al pack)
  - `components = upsertComponent(value.components ?? [], nextComponent)`
  - `excludedSkuIds = excludedSkuIds.filter((id) => id !== skuId)`
  - `onChange(recalcParentFromComponents(value, components))`
  - cierra modal.

## Reglas de cálculo

- El total del item padre siempre refleja la suma de `components.total` cuando `hasPack` y hay componentes.
- Para SKUs agregados manualmente (no-pack):
  - Su cantidad **no se auto-ajusta** al cambiar `value.quantity` (se mantiene fija).
  - Esto coincide con el comportamiento actual cuando `isEditing` es true: `buildComponentsFromQuantity` preserva cantidades existentes.

## Datos y caché de labels

Problema: `componentRows` usa `buildSkuLabelFromDetailItem(packItem)` si el SKU está en el pack; si no, hoy muestra `component.skuId`.

Solución:
- Mantener un cache local en `SaleOrderItemEditorModal` (p. ej. `skuMetaById: Record<string, { label: string; price?: number }>` o `Map`) alimentado al seleccionar/agregar SKU desde el modal.
- Para componentes no asociados a pack, el label se resuelve desde este cache; fallback a `skuId`.

## Validaciones

- No permitir agregar si:
  - `skuId` vacío.
  - `quantity <= 0`.
  - `unitPrice < 0`.
- Al agregar, si el SKU ya existe en `components`, se actualiza (upsert) en vez de duplicar.

## Criterios de aceptación

1) Con pack seleccionado, al abrir “Agregar SKU” puedo buscar y seleccionar SKUs del catálogo.
2) Al seleccionar un SKU con `price`, el input de precio aparece prellenado con ese valor.
3) Al “Agregar”, el SKU aparece en la lista “Productos” del item (y no como solo `skuId`, sino con nombre/attrs si está en cache).
4) El total y precio unitario del item padre se recalculan desde la suma de componentes.
5) Si elimino un SKU del pack y luego lo agrego desde el modal, reaparece (se remueve de `excludedSkuIds`).

## Nota de implementación (referencias)

- Patrón de búsqueda/label/price ya existe en:
  - `src/features/out-orders/OutOrder.tsx` (búsqueda con `listSkus` y `FloatingSelect` searchable)
  - `src/features/catalog/packs/components/PackItemsEditor.tsx` (mapea `price` desde `item.sku.price`)

