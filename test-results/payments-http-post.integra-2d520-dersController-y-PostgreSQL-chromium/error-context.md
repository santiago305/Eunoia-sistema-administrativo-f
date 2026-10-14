# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payments-http-post.integration.spec.ts >> resuelve pagos al cancelar desde Chromium hasta SaleOrdersController y PostgreSQL
- Location: playwright-tests/payments-http-post.integration.spec.ts:176:1

# Error details

```
TimeoutError: page.goto: Timeout 60000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:4177/e2e/cancellation-resolution-harness.html?order=50000000-0000-4000-8000-000000000001", waiting until "domcontentloaded"

```

# Test source

```ts
  89  |   expect(before).toMatchObject({ status: "PENDING_CONFIRMATION", version: 1, operation_number: null, note: null, edits: 0, movements: 0, outboxEvents: 0 });
  90  | 
  91  |   await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.update_pending,income.view_all");
  92  |   const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  93  |   await expect(row).toContainText("Por confirmar");
  94  |   await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  95  |   await page.getByText("Editar ingreso", { exact: true }).click();
  96  | 
  97  |   const dialog = page.getByRole("dialog", { name: "Modificar pago" });
  98  |   await dialog.getByLabel("Número de operación").fill("OP-HTTP-DUPLICATE");
  99  |   await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  100 |   await expect(dialog.getByRole("alert")).toHaveText("Ese número de operación ya está registrado.");
  101 |   await expect(dialog).toBeVisible();
  102 |   await expect(row).toContainText("Por confirmar");
  103 | 
  104 |   const after = await request.get(`${apiBase}/test-edit-state`).then((response) => response.json());
  105 |   expect(after).toMatchObject({ status: "PENDING_CONFIRMATION", version: 1, operation_number: null, note: null, edits: 0, movements: 0, outboxEvents: 0 });
  106 | });
  107 | 
  108 | test("guarda una edición pendiente desde Chromium hasta IncomeController y PostgreSQL", async ({ page, request }) => {
  109 |   const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  110 |   const prepared = await request.post(`${apiBase}/prepare-edit-duplicate`).then((response) => response.json());
  111 |   expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000003" });
  112 | 
  113 |   await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.update_pending,income.view_all");
  114 |   const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  115 |   await expect(row).toContainText("Por confirmar");
  116 |   await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  117 |   await page.getByText("Editar ingreso", { exact: true }).click();
  118 | 
  119 |   const dialog = page.getByRole("dialog", { name: "Modificar pago" });
  120 |   await dialog.getByLabel("Número de operación").fill("OP-HTTP-EDIT-SUCCESS");
  121 |   await dialog.getByLabel("Descripción").fill("Actualizado desde Chromium");
  122 |   await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  123 |   await expect(dialog).toBeHidden();
  124 | 
  125 |   const after = await request.get(`${apiBase}/test-edit-state`).then((response) => response.json());
  126 |   expect(after).toMatchObject({
  127 |     status: "PENDING_CONFIRMATION",
  128 |     version: 2,
  129 |     operation_number: "OP-HTTP-EDIT-SUCCESS",
  130 |     note: "Actualizado desde Chromium",
  131 |     edits: 1,
  132 |     movements: 0,
  133 |     outboxEvents: 1,
  134 |   });
  135 | });
  136 | 
  137 | test("corrige un ingreso contabilizado desde Chromium y verifica reversa y reemplazo en PostgreSQL", async ({ page, request }) => {
  138 |   const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  139 |   const prepared = await request.post(`${apiBase}/prepare-correct`).then((response) => response.json());
  140 |   expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });
  141 | 
  142 |   await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.correct_posted,income.view_all");
  143 |   const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  144 |   await expect(row).toContainText("Contabilizado");
  145 |   await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  146 |   await page.getByText("Corregir ingreso contabilizado", { exact: true }).click();
  147 | 
  148 |   const dialog = page.getByRole("dialog", { name: "Corregir ingreso contabilizado" });
  149 |   await dialog.getByLabel("Número de operación").fill("OP-HTTP-CORRECTED");
  150 |   await dialog.getByLabel("Descripción").fill("Reemplazo confirmado desde Chromium");
  151 |   await dialog.getByLabel("Motivo de la corrección").fill("Corrección integral E2E");
  152 |   const correctionResponsePromise = page.waitForResponse((response) => response.url().includes(`/income/${prepared.incomeId}/correct`));
  153 |   await dialog.getByRole("button", { name: "Corregir ingreso" }).click();
  154 |   const correctionResponse = await correctionResponsePromise;
  155 |   const correctionBody = await correctionResponse.json();
  156 |   expect(correctionResponse.status(), JSON.stringify(correctionBody)).toBe(201);
  157 |   await expect(dialog).toBeHidden();
  158 | 
  159 |   const after = await request.get(`${apiBase}/test-correction-state`).then((response) => response.json());
  160 |   expect(after.source).toMatchObject({ status: "REVERSED", version: 3, operation_number: "OP-HTTP-CORRECTION-ORIGINAL" });
  161 |   expect(after.replacement).toMatchObject({ status: "POSTED", version: 1, operation_number: "OP-HTTP-CORRECTED" });
  162 |   expect(after.movements).toHaveLength(3);
  163 |   expect(after.movements).toEqual(expect.arrayContaining([
  164 |     expect.objectContaining({ paymentId: prepared.incomeId, type: "INCOME", count: 1, amount: "45.67" }),
  165 |     expect.objectContaining({ paymentId: prepared.incomeId, type: "REVERSAL", count: 1, amount: "-45.67" }),
  166 |     expect.objectContaining({ paymentId: after.replacement.id, type: "INCOME", count: 1, amount: "45.67" }),
  167 |   ]));
  168 |   expect(after.allocations).toBe(3);
  169 |   expect(after.outboxEvents).toBe(2);
  170 |   expect(after.audit.map((item: { action_execution: string }) => item.action_execution)).toEqual([
  171 |     "payment_corrected_in",
  172 |     "payment_corrected_out",
  173 |   ]);
  174 | });
  175 | 
  176 | test("resuelve pagos al cancelar desde Chromium hasta SaleOrdersController y PostgreSQL", async ({ page, request }) => {
  177 |   test.setTimeout(90_000);
  178 |   page.setDefaultNavigationTimeout(60_000);
  179 |   const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  180 |   const prepared = await request.post(`${apiBase}/prepare-cancel-order`).then((response) => response.json());
  181 |   expect(prepared).toMatchObject({ ready: true, orderId: "50000000-0000-4000-8000-000000000001" });
  182 |   const before = await request.get(`${apiBase}/test-cancel-order-state`).then((response) => response.json());
  183 |   expect(before).toMatchObject({ currentStateId: null, movements: [expect.objectContaining({ type: "INCOME", amount: "45.67" })], auditEvents: 0, outboxEvents: 0, completedOperations: 0 });
  184 |   expect(before.payments).toEqual(expect.arrayContaining([
  185 |     expect.objectContaining({ id: "60000000-0000-4000-8000-000000000001", status: "POSTED", version: 2 }),
  186 |     expect.objectContaining({ id: "60000000-0000-4000-8000-000000000002", status: "PENDING_CONFIRMATION", version: 1 }),
  187 |   ]));
  188 | 
> 189 |   await page.goto(`/e2e/cancellation-resolution-harness.html?order=${prepared.orderId}`, { waitUntil: "domcontentloaded" });
      |              ^ TimeoutError: page.goto: Timeout 60000ms exceeded.
  190 |   const pending = page.locator("section").filter({ hasText: "Ingreso por confirmar" });
  191 |   const posted = page.locator("section").filter({ hasText: "Ingreso contabilizado" });
  192 |   await expect(pending).toContainText("20.00");
  193 |   await expect(posted).toContainText("45.67");
  194 |   await pending.getByLabel(/Motivo/).fill("Cancelar pendiente por cierre del pedido");
  195 |   await posted.getByLabel(/Motivo/).fill("Conservar contabilizado como saldo del cliente");
  196 |   await page.getByLabel("Confirmo las resoluciones indicadas y la cancelación definitiva del pedido.").check();
  197 |   const cancelResponsePromise = page.waitForResponse((response) => response.url().includes(`/sale-orders/${prepared.orderId}/cancel`));
  198 |   await page.getByRole("button", { name: "Resolver y cancelar pedido" }).click();
  199 |   const cancelResponse = await cancelResponsePromise;
  200 |   expect(cancelResponse.status()).toBe(200);
  201 |   expect(await cancelResponse.json()).toMatchObject({ saleOrderId: prepared.orderId, currentStateId: "90000000-0000-4000-8000-000000000002" });
  202 |   await expect(page.getByTestId("cancellation-result")).toHaveText("completed");
  203 | 
  204 |   const after = await request.get(`${apiBase}/test-cancel-order-state`).then((response) => response.json());
  205 |   expect(after.currentStateId).toBe("90000000-0000-4000-8000-000000000002");
  206 |   expect(after.payments).toEqual(expect.arrayContaining([
  207 |     expect.objectContaining({ id: "60000000-0000-4000-8000-000000000001", status: "POSTED", version: 2 }),
  208 |     expect.objectContaining({ id: "60000000-0000-4000-8000-000000000002", status: "CANCELLED", version: 2 }),
  209 |   ]));
  210 |   expect(after.movements).toEqual([expect.objectContaining({ type: "INCOME", amount: "45.67" })]);
  211 |   expect(after.allocations).toEqual(expect.arrayContaining([
  212 |     expect.objectContaining({ amount: "45.67" }),
  213 |     expect.objectContaining({ amount: "-45.67" }),
  214 |   ]));
  215 |   expect(after.credits).toEqual([expect.objectContaining({ type: "RELEASE", amount: "45.67" })]);
  216 |   expect(after).toMatchObject({ auditEvents: 2, outboxEvents: 2, completedOperations: 1 });
  217 | });
  218 | 
```