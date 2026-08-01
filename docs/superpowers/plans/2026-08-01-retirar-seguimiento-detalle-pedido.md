# Retirar seguimiento del detalle del pedido Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar el bloque `Seguimiento del envío` del detalle/editor sin afectar la columna de seguimiento ni las acciones globales.

**Architecture:** `SaleOrderShippingSection` dejará de recibir datos de seguimiento y volverá a contener únicamente campos y adjuntos de envío. `SaleOrderEditor` dejará de construir esa propiedad; `SaleOrderTrackingCell` permanecerá intacto para la tabla principal.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, pnpm.

---

### Task 1: Retirar el bloque del editor

**Files:**
- Modify: `src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx`
- Modify: `src/features/sale-orders/components/editor/SaleOrderShippingSection.tsx`
- Modify: `src/features/sale-orders/components/editor/SaleOrderEditor.tsx`

- [x] **Step 1: escribir la prueba RED**

Reemplazar la prueba del layout de seguimiento por un contrato que demuestre que la propiedad anterior ya no debe producir contenido:

```tsx
it("does not expose tracking inside the shipping section", () => {
  render(
    <SaleOrderShippingSection
      form={buildEmptySaleOrderEditorForm()}
      setForm={vi.fn()}
      subsidiaryOptions={[]}
      // @ts-expect-error tracking is intentionally no longer part of shipping
      tracking={{ preguide: false, prepared: false }}
    />,
  );

  expect(screen.queryByTestId("sale-order-shipping-tracking")).not.toBeInTheDocument();
  expect(screen.queryByText("Seguimiento del envío")).not.toBeInTheDocument();
  expect(screen.getByText("Agencia/Dirección")).toBeInTheDocument();
});
```

- [x] **Step 2: verificar RED**

Ejecutar:

```powershell
pnpm test:unit -- src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx
```

Resultado esperado: la prueba falla porque el componente todavía renderiza `sale-order-shipping-tracking`.

- [x] **Step 3: implementar la eliminación mínima**

En `SaleOrderShippingSection.tsx`:

- eliminar el import de `SaleOrderTrackingCell`;
- eliminar `tracking` del tipo `Props` y del destructuring;
- dejar el grid primario con una sola columna;
- dejar la celda de agencia con `className="min-w-0"`;
- eliminar por completo el JSX condicionado por `tracking`.

En `SaleOrderEditor.tsx`, dejar la llamada así:

```tsx
<SaleOrderShippingSection
  form={form}
  setForm={setForm}
  subsidiaryOptions={subsidiaryOptions}
  onSearchSubsidiaries={setSubsidiarySearchQuery}
/>
```

- [x] **Step 4: verificar GREEN y ausencia residual**

Ejecutar:

```powershell
pnpm test:unit -- src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx
rg -n "sale-order-shipping-tracking|Seguimiento del envío|tracking=" src/features/sale-orders/components/editor
```

Resultado esperado: la prueba pasa y la búsqueda solo encuentra las aserciones negativas de la prueba.

- [x] **Step 5: verificar la tabla y compilar**

Ejecutar:

```powershell
pnpm test:unit -- src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx src/features/sale-orders/SaleOrders.test.tsx
pnpm build
```

Resultado esperado: el componente de tabla y la pantalla de Pedidos conservan el seguimiento; el build termina con código 0.

- [x] **Step 6: commit**

```powershell
git add src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx src/features/sale-orders/components/editor/SaleOrderShippingSection.tsx src/features/sale-orders/components/editor/SaleOrderEditor.tsx docs/superpowers/plans/2026-08-01-retirar-seguimiento-detalle-pedido.md
git commit -m "refactor: remove tracking from order detail"
```

## Resultado

- Prueba RED confirmada al encontrar el bloque anterior.
- `SaleOrderShippingSection`: 4 pruebas aprobadas.
- Tabla y pantalla de Pedidos: 22 pruebas aprobadas.
- Lint de los tres archivos modificados: sin problemas.
- Build de producción: aprobado.
