# Seguimiento de pedidos UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir preguía y preparación en etiquetas interactivas estables, rediseñar su cambio masivo según el patrón de estados y evitar respuestas 500 causadas después de persistir el cambio.

**Architecture:** `SaleOrderTrackingCell` será la única unidad visual para tabla y editor y consolidará clics por campo con semántica de último valor. El modal masivo filtrará localmente los pedidos seleccionados y entregará identificadores y un único cambio a `SaleOrders`. En backend, los endpoints de seguimiento conservarán el resultado persistido aunque falle exclusivamente la notificación en tiempo real posterior.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Testing Library, Vitest, NestJS, Jest, Supertest.

---

## Estructura de archivos

- Modificar `src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.tsx`: etiquetas, variantes y consolidación de clics.
- Modificar `src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx`: interacción, permisos, debounce, serialización y rollback.
- Modificar `src/features/sale-orders/components/editor/SaleOrderShippingSection.tsx`: bloque propio de seguimiento.
- Crear `src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx`: estructura sin superposición.
- Reescribir `src/features/sale-orders/components/bulk/SaleOrderBulkTrackingModal.tsx`: filtros, vista previa y ejecución dependiente.
- Crear `src/features/sale-orders/components/bulk/SaleOrderBulkTrackingModal.spec.tsx`: filtros, permisos y payload.
- Modificar `src/features/sale-orders/SaleOrders.tsx`: persistencia individual y masiva con identificadores filtrados.
- Modificar `src/features/sale-orders/SaleOrders.test.tsx`: integración de etiquetas y modal.
- Modificar `src/features/sale-orders/components/editor/SaleOrderEditor.tsx`: propagar errores y confirmar el valor guardado.
- Modificar `src/modules/sale-orders/adapters/in/controllers/sale-orders.controller.spec.ts`: reproducción del 500 posterior a persistencia.
- Modificar `src/modules/sale-orders/adapters/in/controllers/sale-orders.controller.ts`: notificación segura solo para seguimiento.

### Task 1: Reproducir y corregir el 500 posterior a persistencia

**Files:**
- Modify: `../Eunoia-sistema-administrativo-b/src/modules/sale-orders/adapters/in/controllers/sale-orders.controller.spec.ts`
- Modify: `../Eunoia-sistema-administrativo-b/src/modules/sale-orders/adapters/in/controllers/sale-orders.controller.ts`

- [ ] **Step 1: Escribir la prueba fallida**

Agregar `SetSaleOrdersTrackingUsecase` al módulo de prueba mediante un mock `setTracking.execute` que devuelva un resultado exitoso. Crear un caso para `PATCH /sale-orders/:id/tracking` en el que `realtimePayload.build` rechace después de que el caso de uso termine:

```ts
realtimePayload.build.mockRejectedValueOnce(new Error("socket payload failed"));

await request(app.getHttpServer())
  .patch("/sale-orders/11111111-1111-4111-8111-111111111111/tracking")
  .send({ preguide: true })
  .expect(200)
  .expect(({ body }) => expect(body.data.succeeded).toBe(1));

expect(setTracking.execute).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Verificar RED**

Run: `npm test -- --runInBand src/modules/sale-orders/adapters/in/controllers/sale-orders.controller.spec.ts`

Expected: FAIL con HTTP 500 porque `notifySaleOrderUpdated` propaga el rechazo.

- [ ] **Step 3: Implementar la protección mínima**

Importar `Logger`, crear un logger del controlador y envolver únicamente las notificaciones posteriores a cambios de seguimiento:

```ts
private readonly logger = new Logger(SaleOrdersController.name);

private async notifyTrackingUpdatedSafely(saleOrderIds: string[], source: string) {
  try {
    await this.notifySaleOrdersUpdated(saleOrderIds, source);
  } catch (error) {
    this.logger.error(
      `No se pudo emitir la actualización de seguimiento (${source})`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
```

Usar este método en los endpoints individual y masivo después de obtener los identificadores exitosos. El error del caso de uso debe seguir propagándose normalmente.

- [ ] **Step 4: Verificar GREEN**

Run: `npm test -- --runInBand src/modules/sale-orders/adapters/in/controllers/sale-orders.controller.spec.ts`

Expected: PASS; la actualización se ejecuta una vez y la falla de realtime no cambia el HTTP.

### Task 2: Convertir los estados en etiquetas y consolidar clics

**Files:**
- Modify: `src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx`
- Modify: `src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.tsx`

- [ ] **Step 1: Escribir pruebas fallidas de presentación e interacción**

Cubrir:

```tsx
expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
expect(screen.getByRole("button", { name: /sin preguía/i })).toBeInTheDocument();
expect(screen.getByText("Sin preparar")).not.toHaveAttribute("role", "button");
```

Usar timers falsos para pulsar tres veces antes de 250 ms y verificar que `onChange` recibe una sola llamada con el último valor. Añadir una promesa controlada para comprobar que no hay dos llamadas en paralelo y que solo el valor final pendiente se ejecuta después. Añadir rechazo para comprobar que la etiqueta vuelve al valor confirmado.

- [ ] **Step 2: Verificar RED**

Run: `npm run test:unit -- src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx`

Expected: FAIL porque todavía existen checkboxes y cada cambio se envía inmediatamente.

- [ ] **Step 3: Implementar etiquetas accesibles y último valor**

Eliminar `Checkbox`. Mantener por campo `confirmed`, `displayed`, `desired`, un temporizador y una bandera de solicitud activa. El botón cambia `displayed` inmediatamente; `flush` compara `desired` con `confirmed`, espera a la solicitud activa y ejecuta como máximo una llamada adicional con el último valor.

La API visual será:

```ts
type Props = {
  order: Pick<SaleOrder, "preguide" | "prepared">;
  canUpdatePreguide: boolean;
  canUpdatePrepared: boolean;
  onChange: (field: TrackingField, value: boolean) => Promise<void>;
  variant?: "table" | "editor";
};
```

Las etiquetas activas usarán texto e icono verde; las pendientes, texto e icono ámbar/zinc. Los botones tendrán `type="button"`, foco visible, `aria-busy` y `title` de la acción.

- [ ] **Step 4: Verificar GREEN**

Run: `npm run test:unit -- src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx`

Expected: PASS sin solicitudes paralelas.

### Task 3: Integrar seguimiento correctamente en el editor

**Files:**
- Create: `src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx`
- Modify: `src/features/sale-orders/components/editor/SaleOrderShippingSection.tsx`
- Modify: `src/features/sale-orders/components/editor/SaleOrderEditor.tsx`

- [ ] **Step 1: Escribir la prueba fallida de estructura**

Renderizar la sección y afirmar que existe `Seguimiento del envío`, que contiene ambas etiquetas, y que `Agencia/Dirección` está en un bloque hermano posterior, no dentro del control de seguimiento.

- [ ] **Step 2: Verificar RED**

Run: `npm run test:unit -- src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx`

Expected: FAIL porque el bloque no existe.

- [ ] **Step 3: Implementar la cuadrícula**

Crear una cuadrícula superior `grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]`. Colocar Agencia/Dirección en la primera celda y un panel con título `Seguimiento del envío` y `variant="editor"` en la segunda. En `SaleOrderEditor`, actualizar el estado confirmado solo tras el éxito y volver a lanzar el error para que el componente pueda ejecutar rollback.

- [ ] **Step 4: Verificar GREEN**

Run: `npm run test:unit -- src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx`

Expected: PASS.

### Task 4: Rediseñar el cambio masivo de seguimiento

**Files:**
- Create: `src/features/sale-orders/components/bulk/SaleOrderBulkTrackingModal.spec.tsx`
- Modify: `src/features/sale-orders/components/bulk/SaleOrderBulkTrackingModal.tsx`

- [ ] **Step 1: Escribir pruebas fallidas del flujo masivo**

Renderizar pedidos con las cuatro combinaciones de `preguide` y `prepared`. Verificar que los filtros ofrecen Todos/Sin/Con y Todos/Sin preparar/Preparados; que `Ejecutar por` respeta permisos; y que confirmar produce:

```ts
expect(onSubmit).toHaveBeenCalledWith({
  saleOrderIds: ["order-without-preguide"],
  preguide: true,
});
```

Verificar también que no hay checkboxes y que el botón se desactiva con cero resultados.

- [ ] **Step 2: Verificar RED**

Run: `npm run test:unit -- src/features/sale-orders/components/bulk/SaleOrderBulkTrackingModal.spec.tsx`

Expected: FAIL porque el modal actual usa dos pares de checkboxes y no recibe pedidos.

- [ ] **Step 3: Implementar modal según cambio de estados**

Usar `Modal`, `FloatingSelect` y `SystemButton`. La API será:

```ts
type SaleOrderBulkTrackingSelection = {
  saleOrderIds: string[];
  preguide?: boolean;
  prepared?: boolean;
};

type Props = {
  open: boolean;
  selectedOrders: SaleOrder[];
  loading?: boolean;
  canUpdatePreguide: boolean;
  canUpdatePrepared: boolean;
  onClose: () => void;
  onSubmit: (selection: SaleOrderBulkTrackingSelection) => Promise<void> | void;
};
```

Calcular `visibleOrders` con dos filtros de valor único. Mostrar la lista y el resumen `Total`/`Visibles`. Generar las opciones de ejecución solo con permisos autorizados y construir un payload de un solo campo.

- [ ] **Step 4: Verificar GREEN**

Run: `npm run test:unit -- src/features/sale-orders/components/bulk/SaleOrderBulkTrackingModal.spec.tsx`

Expected: PASS.

### Task 5: Conectar los nuevos contratos en Pedidos

**Files:**
- Modify: `src/features/sale-orders/SaleOrders.test.tsx`
- Modify: `src/features/sale-orders/SaleOrders.tsx`

- [ ] **Step 1: Escribir la prueba fallida de integración**

Abrir seguimiento masivo con pedidos seleccionados, filtrar y ejecutar. Verificar que el servicio recibe solamente los identificadores filtrados y un campo. Para cambio individual, verificar que una respuesta exitosa fija el valor local y que un rechazo se vuelve a propagar al control después de mostrar feedback.

- [ ] **Step 2: Verificar RED**

Run: `npm run test:unit -- src/features/sale-orders/SaleOrders.test.tsx`

Expected: FAIL por el contrato anterior basado únicamente en `selectedCount`.

- [ ] **Step 3: Implementar integración mínima**

Cambiar el handler masivo a:

```ts
const handleBulkTracking = useCallback(async ({ saleOrderIds, ...change }: SaleOrderBulkTrackingSelection) => {
  await bulkSetSaleOrdersTracking({ saleOrderIds, ...change });
  // cerrar, limpiar selección, recargar y mostrar confirmación
}, [loadOrders, showFeedback]);
```

Pasar `selectedOrders={selectedSaleOrders}` al modal. En el handler individual, llamar al servicio, fijar el valor confirmado al resolver y volver a lanzar el error después del feedback para activar el rollback del control.

- [ ] **Step 4: Verificar GREEN**

Run: `npm run test:unit -- src/features/sale-orders/SaleOrders.test.tsx src/features/sale-orders/components/bulk/SaleOrderBulkTrackingModal.spec.tsx`

Expected: PASS.

### Task 6: Verificación integral

**Files:**
- Verify only.

- [ ] **Step 1: Ejecutar pruebas frontend enfocadas**

Run: `npm run test:unit -- src/features/sale-orders/components/sale-order/SaleOrderTrackingCell.spec.tsx src/features/sale-orders/components/editor/SaleOrderShippingSection.spec.tsx src/features/sale-orders/components/bulk/SaleOrderBulkTrackingModal.spec.tsx src/features/sale-orders/SaleOrders.test.tsx`

Expected: PASS.

- [ ] **Step 2: Compilar frontend**

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 3: Ejecutar prueba backend y compilar**

Run: `npm test -- --runInBand src/modules/sale-orders/adapters/in/controllers/sale-orders.controller.spec.ts`

Run: `npm run build`

Expected: ambos exit 0.

- [ ] **Step 4: Revisar cambios y estado de ramas**

Confirmar que frontend y backend permanecen en `master`, que la modificación previa del tipo `Pick<SaleOrder, "preguide" | "prepared">` fue preservada y que no se incluyeron archivos ajenos.
