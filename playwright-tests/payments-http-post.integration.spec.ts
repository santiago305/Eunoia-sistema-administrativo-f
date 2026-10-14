import { expect, test } from "@playwright/test";

test.skip(process.env.PAYMENTS_HTTP_INTEGRATION !== "1", "Requiere la red Docker financiera efímera.");

test("contabiliza desde Ingresos: navegador → API HTTP → PostgreSQL real", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-post`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });
  const before = await request.get(`${apiBase}/test-state`).then((response) => response.json());
  expect(before).toMatchObject({ status: "PENDING_CONFIRMATION", version: 1, movements: 0, allocations: 0 });

  await page.goto("/e2e/income-page-harness.html");
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await expect(row).toContainText("Por confirmar");
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Contabilizar", { exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Contabilizar ingreso" });
  await expect(dialog).toContainText("45.67");
  await expect(dialog.getByRole("button", { name: "Contabilizar" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Contabilizar" }).click();
  await expect(row).toContainText("Contabilizado");

  const after = await request.get(`${apiBase}/test-state`).then((response) => response.json());
  expect(after).toMatchObject({ status: "POSTED", version: 2, movements: 1, allocations: 1, outboxEvents: 1, auditEvents: 1, completedOperations: 1 });
});

test("recupera un lote contabilizado cuando Chromium pierde la respuesta HTTP", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-batch`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeIds: expect.arrayContaining([
    "60000000-0000-4000-8000-000000000001",
    "60000000-0000-4000-8000-000000000003",
  ]) });
  const before = await request.get(`${apiBase}/test-batch-state`).then((response) => response.json());
  expect(before).toMatchObject({ movements: 0, allocations: 0, outboxEvents: 0, auditEvents: 0, completedBatches: 0 });
  expect(before.payments).toEqual(expect.arrayContaining([
    expect.objectContaining({ status: "PENDING_CONFIRMATION", version: 1 }),
    expect.objectContaining({ status: "PENDING_CONFIRMATION", version: 1 }),
  ]));

  let batchPostCount = 0;
  let idempotencyKey = "";
  await page.route("**/income/post-batch", async (route) => {
    batchPostCount += 1;
    const body = route.request().postDataJSON() as { idempotencyKey: string };
    idempotencyKey = body.idempotencyKey;
    const committedResponse = await route.fetch();
    expect(committedResponse.status()).toBe(201);
    const committedBody = await committedResponse.json();
    expect(committedBody).toMatchObject({ type: "success", count: 2, batchId: idempotencyKey });
    // The API has committed; abort only the browser-facing response to simulate a lost connection.
    await route.abort("failed");
  });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.post_bulk,income.view_all");
  const firstRow = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  const secondRow = page.getByRole("row").filter({ hasText: "PED-HTTP-002" });
  await expect(firstRow).toContainText("Por confirmar");
  await expect(secondRow).toContainText("Por confirmar");
  await firstRow.getByRole("button").first().click();
  await secondRow.getByRole("button").first().click();
  await page.getByRole("button", { name: "Contabilizar seleccionados (2)" }).click();
  const confirmation = page.getByRole("dialog", { name: "Contabilizar ingresos" });
  await expect(confirmation).toBeVisible();
  const recoveredResultPromise = page.waitForResponse((response) => response.url().includes("/income/bulk-operations/"));
  await confirmation.getByRole("button", { name: "Contabilizar", exact: true }).click();
  const recoveredResult = await recoveredResultPromise;
  expect(recoveredResult.status()).toBe(200);
  expect(await recoveredResult.json()).toMatchObject({ type: "success", batchId: idempotencyKey, count: 2 });
  await expect(firstRow).toContainText("Contabilizado");
  await expect(secondRow).toContainText("Contabilizado");
  expect(batchPostCount).toBe(1);

  const after = await request.get(`${apiBase}/test-batch-state`).then((response) => response.json());
  expect(after).toMatchObject({ movements: 2, allocations: 2, outboxEvents: 2, auditEvents: 2, completedBatches: 1 });
  expect(after.payments).toEqual(expect.arrayContaining([
    expect.objectContaining({ status: "POSTED", version: 2 }),
    expect.objectContaining({ status: "POSTED", version: 2 }),
  ]));
});

test("reintenta el mismo lote tras recargar cuando el POST nunca llego al servidor", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-batch`).then((response) => response.json());
  expect(prepared.ready).toBe(true);
  const bodies: string[] = [];
  await page.route("**/income/post-batch", async (route) => {
    bodies.push(route.request().postData() ?? "");
    if (bodies.length === 1) { await route.abort("failed"); return; }
    await route.continue();
  });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.post_bulk,income.view_all");
  const firstRow = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  const secondRow = page.getByRole("row").filter({ hasText: "PED-HTTP-002" });
  await firstRow.getByRole("button").first().click();
  await secondRow.getByRole("button").first().click();
  await page.getByRole("button", { name: "Contabilizar seleccionados (2)" }).click();
  const confirmation = page.getByRole("dialog", { name: "Contabilizar ingresos" });
  await confirmation.getByRole("button", { name: "Contabilizar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Recuperar resultado del lote" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Recuperar resultado del lote" })).toBeVisible();

  const retriedPost = page.waitForResponse((response) => response.url().endsWith("/income/post-batch") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Recuperar resultado del lote" }).click();
  expect((await retriedPost).status()).toBe(201);
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(bodies[0]);
  await expect(firstRow).toContainText("Contabilizado");
  await expect(secondRow).toContainText("Contabilizado");
  const after = await request.get(`${apiBase}/test-batch-state`).then((response) => response.json());
  expect(after).toMatchObject({ movements: 2, allocations: 2, outboxEvents: 2, auditEvents: 2, completedBatches: 1 });
});

test("recupera una contabilizaciÃ³n individual confirmada cuando Chromium pierde la respuesta HTTP", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-post`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });
  const before = await request.get(`${apiBase}/test-state`).then((response) => response.json());
  expect(before).toMatchObject({ status: "PENDING_CONFIRMATION", version: 1, movements: 0, allocations: 0 });

  let postCount = 0;
  let resultLookupCount = 0;
  let idempotencyKey = "";
  let allowExplicitRecovery = false;
  await page.route("**/income/*/post", async (route) => {
    postCount += 1;
    const body = route.request().postDataJSON() as { idempotencyKey: string };
    idempotencyKey = body.idempotencyKey;
    const committedResponse = await route.fetch();
    expect(committedResponse.status()).toBe(201);
    expect(await committedResponse.json()).toMatchObject({ type: "success", count: 1, batchId: idempotencyKey });
    await route.abort("failed");
  });
  await page.route("**/income/posting-operations/*", async (route) => {
    if (route.request().method() !== "GET") { await route.continue(); return; }
    resultLookupCount += 1;
    if (!allowExplicitRecovery) { await route.abort("failed"); return; }
    await route.continue();
  });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.post,income.read,income.view_all");
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await expect(row).toContainText("Por confirmar");
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Contabilizar", { exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Contabilizar ingreso" });
  await expect(confirmation.getByRole("button", { name: "Contabilizar", exact: true })).toBeEnabled();
  await confirmation.getByRole("button", { name: "Contabilizar", exact: true }).click();
  const recoverButtonName = "Recuperar resultado del ingreso";
  await expect(page.getByRole("button", { name: recoverButtonName })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: recoverButtonName })).toBeVisible();
  allowExplicitRecovery = true;
  const recoveredResultPromise = page.waitForResponse((response) => response.url().includes("/income/posting-operations/"));
  await page.getByRole("button", { name: recoverButtonName }).click();
  const recoveredResult = await recoveredResultPromise;
  expect(recoveredResult.status()).toBe(200);
  expect(await recoveredResult.json()).toMatchObject({ type: "success", batchId: idempotencyKey, count: 1 });
  await expect(row).toContainText("Contabilizado");
  expect(postCount).toBe(1);
  expect(resultLookupCount).toBeGreaterThanOrEqual(1);

  const after = await request.get(`${apiBase}/test-state`).then((response) => response.json());
  expect(after).toMatchObject({ status: "POSTED", version: 2, movements: 1, allocations: 1, outboxEvents: 1, auditEvents: 1, completedOperations: 1 });
});

test("reintenta el mismo ingreso con la misma clave cuando no existe un resultado previo", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-post`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });

  const keys: string[] = [];
  let postCount = 0;
  await page.route("**/income/*/post", async (route) => {
    postCount += 1;
    keys.push((route.request().postDataJSON() as { idempotencyKey: string }).idempotencyKey);
    if (postCount === 1) { await route.abort("failed"); return; }
    await route.continue();
  });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.post,income.read,income.view_all");
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Contabilizar", { exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Contabilizar ingreso" });

  const missingResultPromise = page.waitForResponse((response) => response.url().includes("/income/posting-operations/"));
  await confirmation.getByRole("button", { name: "Contabilizar", exact: true }).click();
  expect((await missingResultPromise).status()).toBe(404);
  await expect(confirmation.getByRole("button", { name: "Contabilizar", exact: true })).toBeEnabled();

  const completedPostPromise = page.waitForResponse((response) => response.url().includes(`/income/${prepared.incomeId}/post`));
  await confirmation.getByRole("button", { name: "Contabilizar", exact: true }).click();
  expect((await completedPostPromise).status()).toBe(201);
  await expect(row).toContainText("Contabilizado");
  expect(postCount).toBe(2);
  expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/i);
  expect(keys[1]).toBe(keys[0]);

  const after = await request.get(`${apiBase}/test-state`).then((response) => response.json());
  expect(after).toMatchObject({ status: "POSTED", version: 2, movements: 1, allocations: 1, outboxEvents: 1, auditEvents: 1, completedOperations: 1 });
});

test("reintenta la misma contabilizacion individual despues de recargar si el primer POST no llego", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-post`).then((response) => response.json());
  expect(prepared.ready).toBe(true);
  const bodies: string[] = [];
  await page.route("**/income/*/post", async (route) => {
    bodies.push(route.request().postData() ?? "");
    if (bodies.length === 1) { await route.abort("failed"); return; }
    await route.continue();
  });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.post,income.read,income.view_all");
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Contabilizar", { exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Contabilizar ingreso" });
  await confirmation.getByRole("button", { name: "Contabilizar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Recuperar resultado del ingreso" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Recuperar resultado del ingreso" })).toBeVisible();

  const retriedPost = page.waitForResponse((response) => response.url().endsWith(`/income/${prepared.incomeId}/post`) && response.request().method() === "POST");
  await page.getByRole("button", { name: "Recuperar resultado del ingreso" }).click();
  expect((await retriedPost).status()).toBe(201);
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(bodies[0]);
  await expect(row).toContainText("Contabilizado");
  const after = await request.get(`${apiBase}/test-state`).then((response) => response.json());
  expect(after).toMatchObject({ status: "POSTED", version: 2, movements: 1, allocations: 1, outboxEvents: 1, auditEvents: 1, completedOperations: 1 });
});

test("edita desde Ingresos hasta el IncomeController real y conserva el pago ante un número duplicado", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-edit-duplicate`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000003" });

  const before = await request.get(`${apiBase}/test-edit-state`).then((response) => response.json());
  expect(before).toMatchObject({ status: "PENDING_CONFIRMATION", version: 1, operation_number: null, note: null, edits: 0, movements: 0, outboxEvents: 0 });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.update_pending,income.view_all");
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await expect(row).toContainText("Por confirmar");
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Editar ingreso", { exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Modificar pago" });
  await dialog.getByLabel("Número de operación").fill("OP-HTTP-DUPLICATE");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Ese número de operación ya está registrado.");
  await expect(dialog).toBeVisible();
  await expect(row).toContainText("Por confirmar");

  const after = await request.get(`${apiBase}/test-edit-state`).then((response) => response.json());
  expect(after).toMatchObject({ status: "PENDING_CONFIRMATION", version: 1, operation_number: null, note: null, edits: 0, movements: 0, outboxEvents: 0 });
});

test("guarda una edición pendiente desde Chromium hasta IncomeController y PostgreSQL", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-edit-duplicate`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000003" });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.update_pending,income.view_all");
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await expect(row).toContainText("Por confirmar");
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Editar ingreso", { exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Modificar pago" });
  await dialog.getByLabel("Número de operación").fill("OP-HTTP-EDIT-SUCCESS");
  await dialog.getByLabel("Descripción").fill("Actualizado desde Chromium");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(dialog).toBeHidden();

  const after = await request.get(`${apiBase}/test-edit-state`).then((response) => response.json());
  expect(after).toMatchObject({
    status: "PENDING_CONFIRMATION",
    version: 2,
    operation_number: "OP-HTTP-EDIT-SUCCESS",
    note: "Actualizado desde Chromium",
    edits: 1,
    movements: 0,
    outboxEvents: 1,
  });
});

test("recupera una ediciÃ³n pendiente tras perder la respuesta y no duplica auditorÃ­a ni outbox", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-edit-duplicate`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000003" });
  expect(await request.get(`${apiBase}/test-edit-state`).then((response) => response.json()))
    .toMatchObject({ status: "PENDING_CONFIRMATION", version: 1, edits: 0, completedOperations: 0 });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.update_pending,income.view_all");
  const openEditor = async () => {
    const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
    await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
    await page.getByText("Editar ingreso", { exact: true }).click();
    return page.getByRole("dialog", { name: "Modificar pago" });
  };
  const dialog = await openEditor();
  await dialog.getByLabel(/Descripci/).fill("Edicion recuperada por idempotencia");
  const endpoint = new RegExp(`/api/income/${prepared.incomeId}$`);
  const requests: Array<Record<string, unknown>> = [];
  let attempts = 0;
  await page.route(endpoint, async (route) => {
    if (route.request().method() !== "PATCH") { await route.continue(); return; }
    attempts += 1;
    requests.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    if (attempts === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(dialog.getByRole("button", { name: /Reintentar/ })).toBeVisible();
  expect(await request.get(`${apiBase}/test-edit-state`).then((response) => response.json()))
    .toMatchObject({ status: "PENDING_CONFIRMATION", version: 2, edits: 1, outboxEvents: 1, completedOperations: 1 });

  await page.reload();
  const reopenedDialog = await openEditor();
  await expect(reopenedDialog.getByRole("button", { name: /Reintentar/ })).toBeVisible();
  await reopenedDialog.getByRole("button", { name: /Reintentar/ }).click();
  await expect(reopenedDialog).toBeHidden();
  await page.unroute(endpoint);

  expect(attempts).toBe(2);
  expect(requests[0]).toMatchObject({ version: 1, note: "Edicion recuperada por idempotencia", idempotencyKey: expect.any(String) });
  expect(requests[1]).toEqual(requests[0]);
  expect(await request.get(`${apiBase}/test-edit-state`).then((response) => response.json()))
    .toMatchObject({ status: "PENDING_CONFIRMATION", version: 2, note: "Edicion recuperada por idempotencia", edits: 1, movements: 0, outboxEvents: 1, completedOperations: 1 });
});

test("corrige un ingreso contabilizado desde Chromium y verifica reversa y reemplazo en PostgreSQL", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-correct`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.correct_posted,income.view_all");
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await expect(row).toContainText("Contabilizado");
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Corregir ingreso contabilizado", { exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Corregir ingreso contabilizado" });
  await dialog.getByLabel("Número de operación").fill("OP-HTTP-CORRECTED");
  await dialog.getByLabel("Descripción").fill("Reemplazo confirmado desde Chromium");
  await dialog.getByLabel("Motivo de la corrección").fill("Corrección integral E2E");
  const correctionResponsePromise = page.waitForResponse((response) => response.url().includes(`/income/${prepared.incomeId}/correct`));
  await dialog.getByRole("button", { name: "Corregir ingreso" }).click();
  const correctionResponse = await correctionResponsePromise;
  const correctionBody = await correctionResponse.json();
  expect(correctionResponse.status(), JSON.stringify(correctionBody)).toBe(201);
  await expect(dialog).toBeHidden();

  const after = await request.get(`${apiBase}/test-correction-state`).then((response) => response.json());
  expect(after.source).toMatchObject({ status: "REVERSED", version: 3, operation_number: "OP-HTTP-CORRECTION-ORIGINAL" });
  expect(after.replacement).toMatchObject({ status: "POSTED", version: 1, operation_number: "OP-HTTP-CORRECTED" });
  expect(after.movements).toHaveLength(3);
  expect(after.movements).toEqual(expect.arrayContaining([
    expect.objectContaining({ paymentId: prepared.incomeId, type: "INCOME", count: 1, amount: "45.67" }),
    expect.objectContaining({ paymentId: prepared.incomeId, type: "REVERSAL", count: 1, amount: "-45.67" }),
    expect.objectContaining({ paymentId: after.replacement.id, type: "INCOME", count: 1, amount: "45.67" }),
  ]));
  expect(after.allocations).toBe(3);
  expect(after.outboxEvents).toBe(2);
  expect(after.audit.map((item: { action_execution: string }) => item.action_execution)).toEqual([
    "payment_corrected_in",
    "payment_corrected_out",
  ]);
});

test("recupera una corrección contabilizada tras perder la respuesta HTTP", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-correct`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });

  const correctionBodies: Array<Record<string, unknown>> = [];
  await page.route(`**/income/${prepared.incomeId}/correct`, async (route) => {
    correctionBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    if (correctionBodies.length === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.correct_posted,income.view_all");
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Corregir ingreso contabilizado", { exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Corregir ingreso contabilizado" });
  await dialog.getByLabel(/N.{1,2}mero de operaci.n/i).fill("OP-HTTP-CORRECTION-RECOVERED");
  await dialog.getByLabel(/Descripci/).fill("Corrección recuperada desde Chromium");
  await dialog.getByLabel(/Motivo de la correcci/).fill("Corrección con respuesta perdida");
  await dialog.getByRole("button", { name: "Corregir ingreso" }).click();

  const recovered = page.getByRole("status", { name: "Correcciones por recuperar" });
  await expect(recovered).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Corregir ingreso contabilizado" })).toHaveCount(0);
  await page.reload();
  await expect(recovered).toBeVisible();
  const resultPromise = page.waitForResponse((response) => response.url().endsWith(`/income/${prepared.incomeId}/correct`));
  await recovered.getByRole("button", { name: "Recuperar resultado de la corrección" }).click();
  const result = await resultPromise;
  expect(result.status()).toBe(201);
  await expect(page.getByRole("status", { name: "Correcciones por recuperar" })).toHaveCount(0);

  expect(correctionBodies).toHaveLength(2);
  expect(correctionBodies[1]).toEqual(correctionBodies[0]);
  expect(correctionBodies[0]).toMatchObject({
    version: 2, operationNumber: "OP-HTTP-CORRECTION-RECOVERED",
    reason: "Corrección con respuesta perdida", idempotencyKey: expect.any(String),
  });
  const after = await request.get(`${apiBase}/test-correction-state`).then((response) => response.json());
  expect(after.source).toMatchObject({ status: "REVERSED", version: 3 });
  expect(after.replacement).toMatchObject({ status: "POSTED", version: 1, operation_number: "OP-HTTP-CORRECTION-RECOVERED" });
  expect(after.movements).toHaveLength(3);
  expect(after.allocations).toBe(3);
  expect(after.outboxEvents).toBe(2);
  expect(after.audit.map((item: { action_execution: string }) => item.action_execution)).toEqual(["payment_corrected_in", "payment_corrected_out"]);
});

test("resuelve pagos al cancelar desde Chromium hasta el caso de uso financiero y PostgreSQL", async ({ page, request }) => {
  test.setTimeout(180_000);
  page.setDefaultNavigationTimeout(120_000);
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-cancel-order`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, orderId: "50000000-0000-4000-8000-000000000001" });
  const before = await request.get(`${apiBase}/test-cancel-order-state`).then((response) => response.json());
  expect(before).toMatchObject({ currentStateId: null, movements: [expect.objectContaining({ type: "INCOME", amount: "45.67" })], auditEvents: 0, outboxEvents: 0, completedOperations: 0 });
  expect(before.payments).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "60000000-0000-4000-8000-000000000001", status: "POSTED", version: 2 }),
    expect.objectContaining({ id: "60000000-0000-4000-8000-000000000002", status: "PENDING_CONFIRMATION", version: 1 }),
  ]));

  await page.goto(`/e2e/cancellation-resolution-harness.html?order=${prepared.orderId}`, { waitUntil: "commit" });
  const pending = page.locator("section").filter({ hasText: "OP-CANCEL-PENDING" });
  const posted = page.locator("section").filter({ hasText: "Ingreso contabilizado" });
  await expect(pending).toContainText("20.00");
  await expect(posted).toContainText("45.67");
  await pending.getByLabel(/Motivo/).fill("Cancelar pendiente por cierre del pedido");
  await posted.getByLabel(/Motivo/).fill("Conservar contabilizado como saldo del cliente");
  await page.getByLabel("Confirmo las resoluciones indicadas y la cancelación definitiva del pedido.").check();
  const cancelResponsePromise = page.waitForResponse((response) => response.url().includes(`/sale-orders/${prepared.orderId}/cancel`));
  await page.getByRole("button", { name: "Resolver y cancelar pedido" }).click();
  const cancelResponse = await cancelResponsePromise;
  expect(cancelResponse.status()).toBe(200);
  expect(await cancelResponse.json()).toMatchObject({ saleOrderId: prepared.orderId, currentStateId: "90000000-0000-4000-8000-000000000002" });
  await expect(page.getByTestId("cancellation-result")).toHaveText("completed");

  const after = await request.get(`${apiBase}/test-cancel-order-state`).then((response) => response.json());
  expect(after.currentStateId).toBe("90000000-0000-4000-8000-000000000002");
  expect(after.payments).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "60000000-0000-4000-8000-000000000001", status: "POSTED", version: 2 }),
    expect.objectContaining({ id: "60000000-0000-4000-8000-000000000002", status: "CANCELLED", version: 2 }),
  ]));
  expect(after.movements).toEqual([expect.objectContaining({ type: "INCOME", amount: "45.67" })]);
  expect(after.allocations).toEqual(expect.arrayContaining([
    expect.objectContaining({ amount: "45.67" }),
    expect.objectContaining({ amount: "-45.67" }),
  ]));
  expect(after.credits).toEqual([expect.objectContaining({ type: "RELEASE", amount: "45.67" })]);
  expect(after).toMatchObject({ auditEvents: 2, outboxEvents: 2, completedOperations: 1 });
});

test("transfiere un ingreso pendiente desde la modal y conserva la resolución en PostgreSQL", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-cancel-order`).then((response) => response.json());
  await page.goto(`/e2e/cancellation-resolution-harness.html?order=${prepared.orderId}&permissions=sale_orders.payments.transfer_pending`, { waitUntil: "commit" });

  const pending = page.locator("section").filter({ hasText: "Ingreso por confirmar" });
  const posted = page.locator("section").filter({ hasText: "Ingreso contabilizado" });
  await pending.locator("select").selectOption("TRANSFER_PENDING");
  const target = pending.getByLabel("Pedido destino");
  await expect(target.locator("option[value='50000000-0000-4000-8000-000000000003']")).toContainText("PED-CANCEL-TARGET");
  await target.selectOption("50000000-0000-4000-8000-000000000003");
  await pending.getByLabel(/Motivo/).fill("El ingreso corresponde al pedido destino");
  await posted.getByLabel(/Motivo/).fill("Conservar pago contabilizado como saldo");
  await page.getByLabel(/Confirmo las resoluciones indicadas/).check();
  const responsePromise = page.waitForResponse((response) => response.url().includes(`/sale-orders/${prepared.orderId}/cancel`));
  await page.getByRole("button", { name: "Resolver y cancelar pedido" }).click();
  expect((await responsePromise).status()).toBe(200);

  const after = await request.get(`${apiBase}/test-cancel-order-state`).then((response) => response.json());
  expect(after.payments).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "60000000-0000-4000-8000-000000000001", status: "POSTED", saleOrderId: prepared.orderId }),
    expect.objectContaining({ id: "60000000-0000-4000-8000-000000000002", status: "PENDING_CONFIRMATION", version: 2, saleOrderId: "50000000-0000-4000-8000-000000000003" }),
  ]));
  expect(after.movements).toEqual([expect.objectContaining({ type: "INCOME", amount: "45.67" })]);
  expect(after).toMatchObject({ auditEvents: 3, outboxEvents: 3, completedOperations: 1 });
});

test("aplica crédito al pedido compatible desde la modal y registra el neto en PostgreSQL", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-cancel-order`).then((response) => response.json());
  await page.goto(`/e2e/cancellation-resolution-harness.html?order=${prepared.orderId}&permissions=customer_credits.apply`, { waitUntil: "commit" });

  const pending = page.locator("section").filter({ hasText: "Ingreso por confirmar" });
  const posted = page.locator("section").filter({ hasText: "Ingreso contabilizado" });
  await posted.locator("select").selectOption("APPLY_TO_ORDER");
  const target = posted.getByLabel("Pedido destino");
  await expect(target.locator("option[value='50000000-0000-4000-8000-000000000003']")).toContainText("PED-CANCEL-TARGET");
  await target.selectOption("50000000-0000-4000-8000-000000000003");
  await posted.getByLabel("Importe a aplicar (PEN)").fill("12.75");
  await posted.getByLabel(/Motivo/).fill("Aplicar parcialmente el saldo al otro pedido");
  await pending.getByLabel(/Motivo/).fill("Cancelar pendiente por cierre del pedido");
  await page.getByLabel(/Confirmo las resoluciones indicadas/).check();
  const responsePromise = page.waitForResponse((response) => response.url().includes(`/sale-orders/${prepared.orderId}/cancel`));
  await page.getByRole("button", { name: "Resolver y cancelar pedido" }).click();
  expect((await responsePromise).status()).toBe(200);

  const after = await request.get(`${apiBase}/test-cancel-order-state`).then((response) => response.json());
  expect(after.allocations).toEqual(expect.arrayContaining([
    expect.objectContaining({ amount: "45.67" }),
    expect.objectContaining({ amount: "-45.67" }),
    expect.objectContaining({ amount: "12.75", saleOrderId: "50000000-0000-4000-8000-000000000003" }),
  ]));
  expect(after.credits).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "RELEASE", amount: "45.67" }),
    expect.objectContaining({ type: "APPLY", amount: "-12.75" }),
  ]));
  expect(after.movements).toEqual([expect.objectContaining({ type: "INCOME", amount: "45.67" })]);
  expect(after).toMatchObject({ refunds: [], auditEvents: 2, outboxEvents: 2, completedOperations: 1 });
});

test("registra reembolso parcial pendiente desde la modal sin crear salida bancaria", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-cancel-order`).then((response) => response.json());
  await page.goto(`/e2e/cancellation-resolution-harness.html?order=${prepared.orderId}&permissions=customer_refunds.create`, { waitUntil: "commit" });

  const pending = page.locator("section").filter({ hasText: "Ingreso por confirmar" });
  const posted = page.locator("section").filter({ hasText: "Ingreso contabilizado" });
  await posted.locator("select").selectOption("REFUND");
  await expect(page.getByText(/El reembolso queda pendiente/)).toBeVisible();
  await posted.getByLabel("Importe a reembolsar (PEN)").fill("15.25");
  await posted.getByLabel(/Motivo/).fill("Reembolso parcial solicitado por el cliente");
  await pending.getByLabel(/Motivo/).fill("Cancelar pendiente por cierre del pedido");
  await page.getByLabel(/Confirmo las resoluciones indicadas/).check();
  const responsePromise = page.waitForResponse((response) => response.url().includes(`/sale-orders/${prepared.orderId}/cancel`));
  await page.getByRole("button", { name: "Resolver y cancelar pedido" }).click();
  expect((await responsePromise).status()).toBe(200);

  const after = await request.get(`${apiBase}/test-cancel-order-state`).then((response) => response.json());
  expect(after.refunds).toEqual([expect.objectContaining({ status: "PENDING", amount: 15.25 })]);
  expect(after.credits).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "RELEASE", amount: "45.67" }),
    expect.objectContaining({ type: "REFUND", amount: "-15.25" }),
  ]));
  expect(after.movements).toEqual([expect.objectContaining({ type: "INCOME", amount: "45.67" })]);
  expect(after).toMatchObject({ auditEvents: 2, outboxEvents: 3, completedOperations: 1 });
});

test("el SaleOrdersController deniega la cancelacion si falta el permiso y no altera PostgreSQL", async ({ request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-cancel-order`).then((response) => response.json());
  const before = await request.get(`${apiBase}/test-cancel-order-state`).then((response) => response.json());

  const response = await request.patch(`${apiBase}/api/sale-orders/${prepared.orderId}/cancel`, {
    headers: { "x-e2e-user": "72000000-0000-4000-8000-000000000001" },
    data: {
      idempotencyKey: "c1c6dc2e-c9a5-4a81-a5e6-16bc92ee1925",
      resolutions: [
        { incomeId: "60000000-0000-4000-8000-000000000001", action: "CANCEL_PENDING", reason: "No autorizado" },
        { incomeId: "60000000-0000-4000-8000-000000000002", action: "KEEP_AS_CREDIT", reason: "No autorizado" },
      ],
    },
  });
  expect(response.status()).toBe(403);
  expect(await response.json()).toMatchObject({ message: expect.stringContaining("permisos insuficientes") });

  const after = await request.get(`${apiBase}/test-cancel-order-state`).then((result) => result.json());
  expect(after.currentStateId).toBe(before.currentStateId);
  expect(after.payments).toEqual(before.payments);
  expect(after).toMatchObject({ auditEvents: 0, outboxEvents: 0, completedOperations: 0 });
  expect(after.movements).toEqual(before.movements);
});

test("recupera un reembolso desde Chromium → IncomeController → PostgreSQL después de perder el POST", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-refund-recovery`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, refundId: "61000000-0000-4000-8000-000000000001" });
  const before = await request.get(`${apiBase}/test-refund-recovery-state`).then((response) => response.json());
  expect(before).toMatchObject({ status: "PENDING", movements: 0, completedOperations: 0 });

  const postBodies: Array<Record<string, unknown>> = [];
  await page.route(`**/income/refunds/${prepared.refundId}/post`, async (route) => {
    postBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ status: "POSTED", refundId: prepared.refundId });
    if (postBodies.length === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });

  await page.goto(`/e2e/income-refund-lifecycle-harness.html?incomeId=${prepared.incomeId}&saleOrderId=50000000-0000-4000-8000-000000000001&companyId=10000000-0000-4000-8000-000000000001`);
  let dialog = page.getByRole("dialog", { name: "Reembolsos del ingreso" });
  await expect(dialog.getByText("Pendiente · Reembolso de recuperación E2E")).toBeVisible();
  await dialog.getByRole("button", { name: /Confirmar devolución/ }).click();
  await dialog.getByLabel("Cuenta de salida").selectOption("20000000-0000-4000-8000-000000000002");
  await dialog.getByRole("textbox", { name: "Número de operación" }).fill("REFUND-RECOVERY-HTTP");
  await dialog.getByLabel(/Confirmo que revisé/).check();
  await dialog.getByRole("button", { name: "Confirmar operación" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toBeVisible();

  await page.reload();
  dialog = page.getByRole("dialog", { name: "Reembolsos del ingreso" });
  await expect(dialog.getByText("Devuelto · Reembolso de recuperación E2E")).toBeVisible();
  await dialog.getByRole("button", { name: "Recuperar operación pendiente" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toHaveCount(0);

  expect(postBodies).toHaveLength(2);
  expect(postBodies[1]).toEqual(postBodies[0]);
  expect(postBodies[0]).toMatchObject({ companyPaymentAccountId: "20000000-0000-4000-8000-000000000002", operationNumber: "REFUND-RECOVERY-HTTP" });
  const after = await request.get(`${apiBase}/test-refund-recovery-state`).then((response) => response.json());
  expect(after).toMatchObject({ status: "POSTED", operationNumber: "REFUND-RECOVERY-HTTP", movements: 1, outboxEvents: 1, completedOperations: 1 });
});

test("recupera conciliación desde Chromium → IncomeController → PostgreSQL después de perder el POST", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-reconciliation-recovery`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });
  const before = await request.get(`${apiBase}/test-reconciliation-recovery-state`).then((response) => response.json());
  expect(before).toMatchObject({ allocations: [], statementLines: 0, completedOperations: 0 });

  const reconcileBodies: Array<Record<string, unknown>> = [];
  await page.route(`**/income/${prepared.incomeId}/reconciliation`, async (route) => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    reconcileBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ type: "success", incomeId: prepared.incomeId });
    if (reconcileBodies.length === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });

  await page.goto(`/e2e/income-reconciliation-harness.html?incomeId=${prepared.incomeId}&saleOrderId=50000000-0000-4000-8000-000000000001&companyId=10000000-0000-4000-8000-000000000001&accountId=20000000-0000-4000-8000-000000000001`);
  let dialog = page.getByRole("dialog", { name: "Conciliación bancaria" });
  await dialog.getByText(/Registrar una línea bancaria manualmente/).click();
  await dialog.getByLabel("Cuenta receptora").selectOption("20000000-0000-4000-8000-000000000001");
  await dialog.getByLabel("Referencia bancaria").fill("BANK-RECOVERY-HTTP");
  await dialog.getByLabel(/Fecha de operación/).fill("2026-10-13");
  await dialog.getByLabel(/Importe de la línea/).fill("80");
  await dialog.getByRole("button", { name: /Registrar línea/ }).click();
  const bankLineOption = dialog.getByLabel(/Línea bancaria disponible/).locator("option").filter({ hasText: "BANK-RECOVERY-HTTP" });
  await expect(bankLineOption).toHaveCount(1);
  const bankLineId = await bankLineOption.getAttribute("value");
  expect(bankLineId).toBeTruthy();
  await dialog.getByLabel(/Línea bancaria disponible/).selectOption(bankLineId!);
  await dialog.getByLabel("Importe a conciliar (PEN)").fill("40");
  await dialog.getByRole("button", { name: "Conciliar importe" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toBeVisible();

  await page.reload();
  dialog = page.getByRole("dialog", { name: "Conciliación bancaria" });
  await expect(dialog.getByText("Conciliación parcial")).toBeVisible();
  await dialog.getByRole("button", { name: "Recuperar operación pendiente" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toHaveCount(0);

  expect(reconcileBodies).toHaveLength(2);
  expect(reconcileBodies[1]).toEqual(reconcileBodies[0]);
  expect(reconcileBodies[0]).toMatchObject({ bankStatementLineId: bankLineId, amount: 40, idempotencyKey: expect.any(String) });
  const after = await request.get(`${apiBase}/test-reconciliation-recovery-state`).then((response) => response.json());
  expect(after).toMatchObject({ allocations: [{ amount: "40.00", unreconciledAt: null }], statementLines: 1, outboxEvents: 1, completedOperations: 1 });
});

test("anula un ingreso pendiente y recupera la misma operaciÃ³n tras perder la respuesta HTTP", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-post`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });
  expect(await request.get(`${apiBase}/test-close-state`).then((response) => response.json()))
    .toMatchObject({ status: "PENDING_CONFIRMATION", version: 1, movements: 0, auditEvents: 0, outboxEvents: 0, completedOperations: 0 });

  const closeBodies: Array<Record<string, unknown>> = [];
  await page.route(`**/income/${prepared.incomeId}/cancel`, async (route) => {
    closeBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ type: "success", incomeId: prepared.incomeId, status: "CANCELLED" });
    if (closeBodies.length === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.cancel_pending,income.view_all");
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await expect(row).toContainText("Por confirmar");
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Cancelar ingreso", { exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Cancelar ingreso pendiente" });
  await dialog.getByRole("textbox").fill("Pago duplicado");
  await dialog.getByRole("button", { name: "Cancelar ingreso", exact: true }).click();

  await expect(page.getByRole("status", { name: "Operaciones de cierre por recuperar" })).toBeVisible();
  await page.reload();
  const recovered = page.getByRole("status", { name: "Operaciones de cierre por recuperar" });
  await expect(recovered).toBeVisible();
  const resultPromise = page.waitForResponse((response) => response.url().endsWith(`/income/${prepared.incomeId}/cancel`));
  await recovered.getByRole("button").click();
  const result = await resultPromise;
  expect(result.status()).toBe(201);
  expect(await result.json()).toMatchObject({ type: "success", incomeId: prepared.incomeId, status: "CANCELLED" });
  await expect(page.getByRole("status", { name: "Operaciones de cierre por recuperar" })).toHaveCount(0);

  expect(closeBodies).toHaveLength(2);
  expect(closeBodies[1]).toEqual(closeBodies[0]);
  expect(closeBodies[0]).toMatchObject({ version: 1, reason: "Pago duplicado", idempotencyKey: expect.any(String) });
  const after = await request.get(`${apiBase}/test-close-state`).then((response) => response.json());
  expect(after).toMatchObject({ status: "CANCELLED", version: 2, voidReason: "Pago duplicado", movements: 0, auditEvents: 1, outboxEvents: 1, completedOperations: 1 });
});

test("revierte un ingreso contabilizado y recupera la misma operaciÃ³n tras perder la respuesta HTTP", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-reverse`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });
  expect(await request.get(`${apiBase}/test-reverse-state`).then((response) => response.json()))
    .toMatchObject({ status: "POSTED", version: 2, movements: [{ type: "INCOME", amount: "45.67" }], allocations: [{ amount: "45.67" }], auditEvents: 0, outboxEvents: 0, completedOperations: 0 });

  const reverseBodies: Array<Record<string, unknown>> = [];
  await page.route(`**/income/${prepared.incomeId}/reverse`, async (route) => {
    reverseBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ type: "success", incomeId: prepared.incomeId, status: "REVERSED" });
    if (reverseBodies.length === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.reverse_posted,income.view_all");
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await expect(row).toContainText("Contabilizado");
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Revertir ingreso", { exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Revertir ingreso contabilizado" });
  await dialog.getByRole("textbox").fill("Pago duplicado confirmado");
  await dialog.getByRole("button", { name: "Revertir ingreso", exact: true }).click();

  await expect(page.getByRole("status", { name: "Operaciones de cierre por recuperar" })).toBeVisible();
  await page.reload();
  const recovered = page.getByRole("status", { name: "Operaciones de cierre por recuperar" });
  await expect(recovered).toBeVisible();
  const resultPromise = page.waitForResponse((response) => response.url().endsWith(`/income/${prepared.incomeId}/reverse`));
  await recovered.getByRole("button").click();
  const result = await resultPromise;
  expect(result.status()).toBe(201);
  expect(await result.json()).toMatchObject({ type: "success", incomeId: prepared.incomeId, status: "REVERSED" });
  await expect(page.getByRole("status", { name: "Operaciones de cierre por recuperar" })).toHaveCount(0);

  expect(reverseBodies).toHaveLength(2);
  expect(reverseBodies[1]).toEqual(reverseBodies[0]);
  expect(reverseBodies[0]).toMatchObject({ version: 2, reason: "Pago duplicado confirmado", idempotencyKey: expect.any(String) });
  const after = await request.get(`${apiBase}/test-reverse-state`).then((response) => response.json());
  expect(after).toMatchObject({ status: "REVERSED", version: 3, voidReason: "Pago duplicado confirmado", auditEvents: 1, outboxEvents: 1, completedOperations: 1 });
  expect(after.movements).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "INCOME", amount: "45.67" }),
    expect.objectContaining({ type: "REVERSAL", amount: "-45.67" }),
  ]));
  expect(after.allocations).toEqual(expect.arrayContaining([
    expect.objectContaining({ amount: "45.67" }),
    expect.objectContaining({ amount: "-45.67" }),
  ]));
});

test("reingresa un cobro cerrado y recupera el nuevo ingreso tras perder la respuesta HTTP", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-reenter`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });
  expect(await request.get(`${apiBase}/test-reenter-state`).then((response) => response.json()))
    .toMatchObject({ source: { status: "CANCELLED", version: 2 }, children: [], auditEvents: 0, outboxEvents: 0, completedOperations: 0 });

  const reentryBodies: Array<Record<string, unknown>> = [];
  let createdIncomeId = "";
  await page.route(`**/income/${prepared.incomeId}/reenter`, async (route) => {
    reentryBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    const result = await response.json();
    expect(result).toMatchObject({ type: "success", sourceIncomeId: prepared.incomeId, status: "PENDING_CONFIRMATION", version: 1 });
    createdIncomeId = result.incomeId;
    if (reentryBodies.length === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });

  await page.goto(`/e2e/income-page-harness.html?companyId=10000000-0000-4000-8000-000000000001&permissions=sale_orders.payments.reenter_closed,income.view_all`);
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Reingresar", { exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Reingresar cobro" });
  await dialog.getByLabel("Motivo").fill("Registrar nuevamente el cobro");
  await dialog.getByRole("button", { name: "Crear ingreso por confirmar" }).click();

  await expect(page.getByRole("status", { name: "Operaciones de reingreso por recuperar" })).toBeVisible();
  await page.reload();
  const recovered = page.getByRole("status", { name: "Operaciones de reingreso por recuperar" });
  await expect(recovered).toBeVisible();
  const resultPromise = page.waitForResponse((response) => response.url().endsWith(`/income/${prepared.incomeId}/reenter`));
  await recovered.getByRole("button").click();
  const result = await resultPromise;
  expect(result.status()).toBe(201);
  expect(await result.json()).toMatchObject({ type: "success", incomeId: createdIncomeId, sourceIncomeId: prepared.incomeId, status: "PENDING_CONFIRMATION" });
  await expect(page.getByRole("status", { name: "Operaciones de reingreso por recuperar" })).toHaveCount(0);

  expect(reentryBodies).toHaveLength(2);
  expect(reentryBodies[1]).toEqual(reentryBodies[0]);
  expect(reentryBodies[0]).toMatchObject({ reason: "Registrar nuevamente el cobro", idempotencyKey: expect.any(String) });
  const after = await request.get(`${apiBase}/test-reenter-state`).then((response) => response.json());
  expect(after).toMatchObject({
    source: { status: "CANCELLED", version: 2 },
    children: [{ id: createdIncomeId, status: "PENDING_CONFIRMATION", version: 1, amount: "45.67" }],
    auditEvents: 1,
    outboxEvents: 1,
    completedOperations: 1,
  });
});

test("recupera una transferencia pendiente idempotente tras perder la respuesta HTTP", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-transfer-recovery`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001", targetOrderId: "50000000-0000-4000-8000-000000000002" });
  expect(await request.get(`${apiBase}/test-transfer-recovery-state`).then((response) => response.json())).toMatchObject({
    saleOrderId: "50000000-0000-4000-8000-000000000001", status: "PENDING_CONFIRMATION", version: 1,
    auditEvents: 0, outboxEvents: 0, completedOperations: 0,
  });

  const transferBodies: Array<Record<string, unknown>> = [];
  await page.route(`**/income/${prepared.incomeId}/transfer`, async (route) => {
    transferBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    expect(response.ok()).toBeTruthy();
    if (transferBodies.length === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });

  await page.goto(`/e2e/income-page-harness.html?companyId=10000000-0000-4000-8000-000000000001&permissions=sale_orders.payments.transfer_pending,income.view_all`);
  const row = page.getByRole("row").filter({ hasText: "PED-HTTP-001" });
  await row.getByRole("button", { name: "Acciones del ingreso PED-HTTP-001" }).click();
  await page.getByText("Transferir a otro pedido", { exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Transferir pago por confirmar" });
  await dialog.getByRole("radio", { name: new RegExp(prepared.targetOrderId) }).check();
  await dialog.getByLabel("Motivo de la transferencia").fill("Pedido asociado incorrecto");
  await dialog.getByRole("button", { name: "Transferir pago" }).click();

  const recovered = page.getByRole("status", { name: "Transferencias por recuperar" });
  await expect(recovered).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Transferir pago por confirmar" })).toHaveCount(0);
  await page.reload();
  await expect(recovered).toBeVisible();
  const resultPromise = page.waitForResponse((response) => response.url().endsWith(`/income/${prepared.incomeId}/transfer`));
  await recovered.getByRole("button", { name: "Recuperar resultado de la transferencia" }).click();
  const result = await resultPromise;
  expect(result.ok()).toBeTruthy();
  await expect(page.getByRole("status", { name: "Transferencias por recuperar" })).toHaveCount(0);

  expect(transferBodies).toHaveLength(2);
  expect(transferBodies[1]).toEqual(transferBodies[0]);
  expect(transferBodies[0]).toMatchObject({
    targetSaleOrderId: prepared.targetOrderId, version: 1,
    reason: "Pedido asociado incorrecto", idempotencyKey: expect.any(String),
  });
  expect(await request.get(`${apiBase}/test-transfer-recovery-state`).then((response) => response.json())).toMatchObject({
    saleOrderId: prepared.targetOrderId, status: "PENDING_CONFIRMATION", version: 2,
    auditEvents: 2, outboxEvents: 2, completedOperations: 1,
  });
});

test("recupera la aplicaciÃ³n de saldo tras perder el POST y no duplica el movimiento", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-credit-recovery`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });
  const bodies: Array<Record<string, unknown>> = [];
  let attempt = 0;
  await page.route("**/api/income/credits/apply", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    bodies.push(body);
    attempt += 1;
    const upstream = await route.fetch();
    if (attempt === 1) await route.fulfill({ status: 502, body: "La respuesta se perdiÃ³ luego del commit de prueba." });
    else await route.fulfill({ response: upstream });
  });

  await page.goto(`/e2e/customer-credit-apply-harness.html?client=${prepared.clientId}&order=${prepared.saleOrderId}`);
  await page.getByRole("button", { name: "Consultar y aplicar saldo a favor" }).click();
  await expect(page.getByText("Disponible en PEN:")).toBeVisible();
  await page.getByLabel("Monto a aplicar (PEN)").fill("12.75");
  await page.getByLabel("Motivo").fill("AplicaciÃ³n autorizada al pedido destino");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Aplicar cr/ }).click();
  const recovery = page.locator('section[role="status"]').filter({ hasText: "saldo por confirmar" });
  await expect(recovery).toBeVisible();
  await page.reload();
  await expect(recovery).toBeVisible();
  await recovery.getByRole("button", { name: /Recuperar/ }).click();
  await expect(page.getByTestId("credit-application-count")).toHaveText("1");

  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  expect(bodies[0]).toMatchObject({ clientId: prepared.clientId, saleOrderId: prepared.saleOrderId, amount: 12.75, idempotencyKey: expect.any(String) });
  const after = await request.get(`${apiBase}/test-credit-recovery-state`).then((response) => response.json());
  expect(after.allocations).toEqual([expect.objectContaining({ saleOrderId: prepared.saleOrderId, amount: "12.75" })]);
  expect(after.credits).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "RELEASE", amount: "30.00" }),
    expect.objectContaining({ type: "APPLY", amount: "-12.75" }),
  ]));
  expect(after.completedOperations).toBe(1);
});

test("recupera el alta de un reembolso pendiente tras perder la respuesta sin reservar dos veces", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-refund-create-recovery`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });
  const createBodies: Array<Record<string, unknown>> = [];
  await page.route(`**/api/income/${prepared.incomeId}/refunds`, async (route) => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    createBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const upstream = await route.fetch();
    expect(upstream.status()).toBe(201);
    if (createBodies.length === 1) await route.fulfill({ status: 502, body: "Respuesta perdida después del commit de prueba." });
    else await route.fulfill({ response: upstream });
  });

  await page.goto(`/e2e/income-refund-lifecycle-harness.html?incomeId=${prepared.incomeId}&saleOrderId=50000000-0000-4000-8000-000000000001&companyId=10000000-0000-4000-8000-000000000001&canCreate=true`);
  const dialog = page.getByRole("dialog", { name: "Reembolsos del ingreso" });
  await expect(dialog.getByText(/Saldo a favor disponible:/)).toContainText(/50\.00/);
  await dialog.getByRole("button", { name: "Nuevo reembolso" }).click();
  await dialog.getByLabel("Importe a reservar (PEN)").fill("15.25");
  await dialog.getByLabel("Motivo").fill("Devolución autorizada por cliente");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Crear reembolso pendiente" }).click();
  const recovery = dialog.getByRole("region", { name: "Operaciones por recuperar" });
  await expect(recovery).toBeVisible();
  await page.reload();
  const reloadedDialog = page.getByRole("dialog", { name: "Reembolsos del ingreso" });
  await expect(reloadedDialog.getByRole("region", { name: "Operaciones por recuperar" })).toBeVisible();
  await reloadedDialog.getByRole("button", { name: /Recuperar operaci/ }).click();
  await expect(reloadedDialog.getByText("Pendiente · Devolución autorizada por cliente")).toBeVisible();

  expect(createBodies).toHaveLength(2);
  expect(createBodies[1]).toEqual(createBodies[0]);
  expect(createBodies[0]).toMatchObject({ amount: 15.25, reason: "Devolución autorizada por cliente", idempotencyKey: expect.any(String) });
  const after = await request.get(`${apiBase}/test-refund-create-recovery-state`).then((response) => response.json());
  expect(after.refunds).toHaveLength(1);
  expect(after.refunds[0]).toMatchObject({ status: "PENDING", amount: "15.25", reason: "Devolución autorizada por cliente" });
  expect(after.credits).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "CREDIT", amount: "50.00" }),
    expect.objectContaining({ type: "REFUND", amount: "-15.25" }),
  ]));
  expect(after).toMatchObject({ auditEvents: 1, outboxEvents: 1, completedOperations: 1 });
});

test("recupera la cancelación de una reserva de reembolso sin duplicar saldos ni auditoría", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-refund-cancel-recovery`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, refundId: "61000000-0000-4000-8000-000000000001" });
  const before = await request.get(`${apiBase}/test-refund-cancel-recovery-state`).then((response) => response.json());
  expect(before).toMatchObject({ status: "PENDING", movements: 0, auditEvents: 0, outboxEvents: 0, completedOperations: 0 });

  const cancelBodies: Array<Record<string, unknown>> = [];
  await page.route(`**/income/refunds/${prepared.refundId}/cancel`, async (route) => {
    cancelBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ type: "success", refundId: prepared.refundId, status: "CANCELLED" });
    if (cancelBodies.length === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });

  await page.goto(`/e2e/income-refund-lifecycle-harness.html?incomeId=${prepared.incomeId}&saleOrderId=50000000-0000-4000-8000-000000000001&companyId=10000000-0000-4000-8000-000000000001`);
  let dialog = page.getByRole("dialog", { name: "Reembolsos del ingreso" });
  await expect(dialog.getByText("Pendiente · Reembolso de cancelacion E2E")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar reserva" }).click();
  await dialog.getByLabel("Motivo").fill("El cliente ya no requiere la devolución");
  await dialog.getByLabel(/Confirmo que revisé/).check();
  await dialog.getByRole("button", { name: "Confirmar operación" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toBeVisible();

  await page.reload();
  dialog = page.getByRole("dialog", { name: "Reembolsos del ingreso" });
  await expect(dialog.getByText("Cancelado · Reembolso de cancelacion E2E")).toBeVisible();
  await dialog.getByRole("button", { name: "Recuperar operación pendiente" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toHaveCount(0);

  expect(cancelBodies).toHaveLength(2);
  expect(cancelBodies[1]).toEqual(cancelBodies[0]);
  expect(cancelBodies[0]).toMatchObject({ reason: "El cliente ya no requiere la devolución", idempotencyKey: expect.any(String) });
  const after = await request.get(`${apiBase}/test-refund-cancel-recovery-state`).then((response) => response.json());
  expect(after).toMatchObject({
    status: "CANCELLED", amount: "15.25", movements: 0, auditEvents: 1, outboxEvents: 1, completedOperations: 1,
    credits: expect.arrayContaining([
      { type: "CREDIT", amount: "50.00" },
      { type: "REFUND", amount: "15.25" },
    ]),
  });
});

test("recupera la reversión de un reembolso contabilizado sin duplicar salidas ni compensaciones", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-refund-reverse-recovery`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, refundId: "61000000-0000-4000-8000-000000000001" });
  const before = await request.get(`${apiBase}/test-refund-reverse-recovery-state`).then((response) => response.json());
  expect(before).toMatchObject({ status: "POSTED", movements: [{ type: "REFUND", amount: "-15.25" }], auditEvents: 0, outboxEvents: 0, completedOperations: 0 });

  const reverseBodies: Array<Record<string, unknown>> = [];
  await page.route(`**/income/refunds/${prepared.refundId}/reverse`, async (route) => {
    reverseBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ type: "success", refundId: prepared.refundId, status: "REVERSED" });
    if (reverseBodies.length === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });

  await page.goto(`/e2e/income-refund-lifecycle-harness.html?incomeId=${prepared.incomeId}&saleOrderId=50000000-0000-4000-8000-000000000001&companyId=10000000-0000-4000-8000-000000000001`);
  let dialog = page.getByRole("dialog", { name: "Reembolsos del ingreso" });
  await expect(dialog.getByText("Devuelto · Reembolso de reversión E2E")).toBeVisible();
  await dialog.getByRole("button", { name: "Revertir reembolso" }).click();
  await dialog.getByLabel("Motivo").fill("La devolución bancaria fue registrada por error");
  await dialog.getByLabel(/Confirmo que revisé/).check();
  await dialog.getByRole("button", { name: "Confirmar operación" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toBeVisible();

  await page.reload();
  dialog = page.getByRole("dialog", { name: "Reembolsos del ingreso" });
  await expect(dialog.getByText("Revertido · Reembolso de reversión E2E")).toBeVisible();
  await dialog.getByRole("button", { name: "Recuperar operación pendiente" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toHaveCount(0);

  expect(reverseBodies).toHaveLength(2);
  expect(reverseBodies[1]).toEqual(reverseBodies[0]);
  expect(reverseBodies[0]).toMatchObject({ reason: "La devolución bancaria fue registrada por error", idempotencyKey: expect.any(String) });
  const after = await request.get(`${apiBase}/test-refund-reverse-recovery-state`).then((response) => response.json());
  expect(after).toMatchObject({
    status: "REVERSED", amount: "15.25", auditEvents: 1, outboxEvents: 1, completedOperations: 1,
    credits: expect.arrayContaining([
      { type: "CREDIT", amount: "50.00" },
      { type: "REFUND", amount: "-15.25" },
      { type: "REFUND", amount: "15.25" },
    ]),
    movements: expect.arrayContaining([
      { type: "REFUND", amount: "-15.25" },
      { type: "REFUND_REVERSAL", amount: "15.25" },
    ]),
  });
});

test("recupera la desconciliación tras recarga y conserva su asignación histórica", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-unreconcile-recovery`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001", allocationId: "63000000-0000-4000-8000-000000000001" });
  const before = await request.get(`${apiBase}/test-unreconcile-recovery-state`).then((response) => response.json());
  expect(before).toMatchObject({
    allocations: [{ id: prepared.allocationId, amount: "40.00", unreconciledAt: null }],
    statementLines: 1, outboxEvents: 0, auditEvents: 0, completedOperations: 0,
  });

  const unreconcileBodies: Array<Record<string, unknown>> = [];
  await page.route(`**/income/${prepared.incomeId}/reconciliation/${prepared.allocationId}/unreconcile`, async (route) => {
    unreconcileBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ type: "success", incomeId: prepared.incomeId, allocationId: prepared.allocationId, reconciliationStatus: "UNRECONCILED" });
    if (unreconcileBodies.length === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });

  await page.goto(`/e2e/income-reconciliation-harness.html?incomeId=${prepared.incomeId}&saleOrderId=50000000-0000-4000-8000-000000000001&companyId=10000000-0000-4000-8000-000000000001&accountId=20000000-0000-4000-8000-000000000001`);
  let dialog = page.getByRole("dialog", { name: "Conciliación bancaria" });
  const allocation = dialog.locator("div.rounded-xl.border").filter({ hasText: "BANK-UNRECONCILE-HTTP" });
  await allocation.getByRole("button", { name: "Desconciliar" }).click();
  await dialog.getByLabel("Motivo de desconciliación").fill("La referencia del extracto no corresponde");
  await dialog.getByLabel(/Confirmo retirar esta asignación/).check();
  await dialog.getByRole("button", { name: "Confirmar desconciliación" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toBeVisible();

  await page.reload();
  dialog = page.getByRole("dialog", { name: "Conciliación bancaria" });
  await expect(dialog.getByText("Desconciliada")).toBeVisible();
  await expect(dialog.getByText("Motivo: La referencia del extracto no corresponde")).toBeVisible();
  await dialog.getByRole("button", { name: "Recuperar operación pendiente" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toHaveCount(0);

  expect(unreconcileBodies).toHaveLength(2);
  expect(unreconcileBodies[1]).toEqual(unreconcileBodies[0]);
  expect(unreconcileBodies[0]).toMatchObject({ reason: "La referencia del extracto no corresponde", idempotencyKey: expect.any(String) });
  const after = await request.get(`${apiBase}/test-unreconcile-recovery-state`).then((response) => response.json());
  expect(after).toMatchObject({
    allocations: [{ id: prepared.allocationId, amount: "40.00", unreconcileReason: "La referencia del extracto no corresponde" }],
    statementLines: 1, outboxEvents: 1, auditEvents: 1, completedOperations: 1,
  });
  expect(after.allocations[0].unreconciledAt).toBeTruthy();
});

test("recupera el alta de una línea bancaria y no duplica referencia ni evento", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-bank-line-create-recovery`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001", bankReference: "BANK-LINE-CREATE-RECOVERY" });
  expect(await request.get(`${apiBase}/test-bank-line-create-recovery-state`).then((response) => response.json()))
    .toMatchObject({ lines: [], outboxEvents: 0, completedOperations: 0 });

  const createBodies: Array<Record<string, unknown>> = [];
  await page.route("**/income/reconciliation/statement-lines", async (route) => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    createBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({
      type: "success",
      line: { bankReference: "BANK-LINE-CREATE-RECOVERY", amount: "72.30", currency: "PEN" },
    });
    if (createBodies.length === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });

  await page.goto(`/e2e/income-reconciliation-harness.html?incomeId=${prepared.incomeId}&saleOrderId=50000000-0000-4000-8000-000000000001&companyId=10000000-0000-4000-8000-000000000001&accountId=20000000-0000-4000-8000-000000000001`);
  let dialog = page.getByRole("dialog", { name: "Conciliación bancaria" });
  await dialog.getByText("Registrar una línea bancaria manualmente").click();
  await dialog.getByLabel("Cuenta receptora").selectOption("20000000-0000-4000-8000-000000000001");
  await dialog.getByLabel("Referencia bancaria").fill("BANK-LINE-CREATE-RECOVERY");
  await dialog.getByLabel(/Fecha de operación/).fill("2026-10-13");
  await dialog.getByLabel(/Importe de la línea/).fill("72.30");
  await dialog.getByRole("button", { name: "Registrar línea" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toBeVisible();

  await page.reload();
  dialog = page.getByRole("dialog", { name: "Conciliación bancaria" });
  await expect(dialog.getByRole("option", { name: /BANK-LINE-CREATE-RECOVERY/ })).toHaveCount(1);
  await dialog.getByRole("button", { name: "Recuperar operación pendiente" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toHaveCount(0);

  expect(createBodies).toHaveLength(2);
  expect(createBodies[1]).toEqual(createBodies[0]);
  expect(createBodies[0]).toMatchObject({
    companyPaymentAccountId: "20000000-0000-4000-8000-000000000001",
    bankReference: "BANK-LINE-CREATE-RECOVERY", operationDate: "2026-10-13", amount: 72.3,
    currency: "PEN", idempotencyKey: expect.any(String),
  });
  const after = await request.get(`${apiBase}/test-bank-line-create-recovery-state`).then((response) => response.json());
  expect(after.lines).toHaveLength(1);
  expect(after.lines[0]).toMatchObject({ bankReference: "BANK-LINE-CREATE-RECOVERY", operationDate: "2026-10-13", amount: "72.30", currency: "PEN" });
  expect(after).toMatchObject({ outboxEvents: 1, completedOperations: 1 });
});

test("el editor de Pedidos valida moneda y recupera un guardado incierto sin duplicar el ingreso", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-with-client-payment`).then((response) => response.json());
  expect(prepared).toMatchObject({
    ready: true,
    saleOrderId: "50000000-0000-4000-8000-000000000004",
    penAccountId: "20000000-0000-4000-8000-000000000001",
    usdAccountId: "20000000-0000-4000-8000-000000000003",
  });
  expect(await request.get(`${apiBase}/test-with-client-payment-state`).then((response) => response.json()))
    .toMatchObject({ payments: [], audit: [], outbox: [], idempotency: [] });

  await page.goto("/e2e/payments-harness.html");
  const endpoint = apiBase.replace(":3200", ":3202") + `/api/sale-orders/${prepared.saleOrderId}/with-client`;
  const submit = (companyPaymentAccountId: string, idempotencyKey: string) => page.evaluate(async ({ endpoint, companyPaymentAccountId, idempotencyKey }) => {
    const form = new FormData();
    form.append("data", JSON.stringify({
      client: { mode: "existing", id: "40000000-0000-4000-8000-000000000001" },
      items: [{ quantity: 1, unitPrice: 100, total: 100, description: "Pedido de pago HTTP" }],
      payments: [{
        clientKey: "with-client-payment-http",
        companyPaymentAccountId,
        paymentMethodId: "30000000-0000-4000-8000-000000000001",
        method: "Transferencia",
        amount: 30.126,
        date: "2026-10-13",
      }],
      removedAttachmentIds: [],
    }));
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "x-e2e-user": "70000000-0000-4000-8000-000000000001", "Idempotency-Key": idempotencyKey },
      body: form,
    });
    return { status: response.status, body: await response.json() };
  }, { endpoint, companyPaymentAccountId, idempotencyKey });

  const incompatibleAccount = await submit(prepared.penAccountId, "11111111-1111-4111-8111-111111111111");
  expect(incompatibleAccount.status).toBe(400);
  expect(await request.get(`${apiBase}/test-with-client-payment-state`).then((response) => response.json()))
    .toMatchObject({ payments: [], audit: [], outbox: [], idempotency: [] });

  const acceptedIdempotencyKey = "22222222-2222-4222-8222-222222222222";
  let acceptedRequests = 0;
  await page.route(endpoint, async (route) => {
    if (route.request().method() !== "PATCH") { await route.continue(); return; }
    acceptedRequests += 1;
    const response = await route.fetch();
    if (acceptedRequests === 1) { await route.abort("failed"); return; }
    await route.fulfill({ response });
  });
  const lostResponse = await page.evaluate(async ({ endpoint, companyPaymentAccountId, idempotencyKey }) => {
    const form = new FormData();
    form.append("data", JSON.stringify({
      client: { mode: "existing", id: "40000000-0000-4000-8000-000000000001" },
      items: [{ quantity: 1, unitPrice: 100, total: 100, description: "Pedido de pago HTTP" }],
      payments: [{
        clientKey: "with-client-payment-http",
        companyPaymentAccountId,
        paymentMethodId: "30000000-0000-4000-8000-000000000001",
        method: "Transferencia",
        amount: 30.126,
        date: "2026-10-13",
      }],
      removedAttachmentIds: [],
    }));
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "x-e2e-user": "70000000-0000-4000-8000-000000000001", "Idempotency-Key": idempotencyKey },
        body: form,
      });
      return { status: response.status };
    } catch {
      return { status: 0 };
    }
  }, { endpoint, companyPaymentAccountId: prepared.usdAccountId, idempotencyKey: acceptedIdempotencyKey });
  expect(lostResponse.status).toBe(0);

  const accepted = await submit(prepared.usdAccountId, acceptedIdempotencyKey);
  expect(accepted.status).toBe(200);
  expect(accepted.body).toMatchObject({ orderId: prepared.saleOrderId });
  expect(acceptedRequests).toBe(2);
  await page.unroute(endpoint);
  const reusedKeyWithDifferentBody = await submit(prepared.penAccountId, acceptedIdempotencyKey);
  expect(reusedKeyWithDifferentBody.status).toBe(409);
  const state = await request.get(`${apiBase}/test-with-client-payment-state`).then((response) => response.json());
  expect(state.payments).toHaveLength(1);
  expect(state.payments[0]).toMatchObject({
    amount: "30.13",
    currency: "USD",
    status: "PENDING_CONFIRMATION",
    company_payment_account_id: prepared.usdAccountId,
    payment_method_id: "30000000-0000-4000-8000-000000000001",
    created_by_user_id: "70000000-0000-4000-8000-000000000001",
    version: 1,
  });
  expect(state.audit).toEqual([{ action_execution: "payment_pending_created", executed_by: "70000000-0000-4000-8000-000000000001" }]);
  expect(state.outbox).toHaveLength(1);
  expect(state.outbox[0]).toMatchObject({
    event_type: "income.payment_pending_created",
    aggregate_id: state.payments[0].id,
    payload: { details: { status: "PENDING_CONFIRMATION", amount: 30.13, currency: "USD" } },
  });
  expect(state.idempotency).toHaveLength(1);
  expect(state.idempotency[0].status).toBe("COMPLETED");
});

test("consulta historial de evidencia desde Pedidos hasta IncomeController y PostgreSQL", async ({ page, request }) => {
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-evidence-history`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });
  const before = await request.get(`${apiBase}/test-evidence-history-state`).then((response) => response.json());
  expect(before).toMatchObject({ revisions: expect.arrayContaining([
    expect.objectContaining({ id: prepared.oldAttachmentId, deleted_at: expect.any(String) }),
    expect.objectContaining({ id: prepared.currentAttachmentId, deleted_at: null }),
  ]), accessLogs: [] });

  const directApi = apiBase.replace(":3200", ":3201");
  const deniedMetadata = await request.get(`${directApi}/api/income/${prepared.incomeId}/evidence/revisions`, {
    headers: { "x-e2e-user": "72000000-0000-4000-8000-000000000001" },
  });
  expect(deniedMetadata.status()).toBe(403);
  const deniedContent = await request.get(`${directApi}/api/income/${prepared.incomeId}/evidence/revisions/${prepared.oldAttachmentId}/content`, {
    headers: { "x-e2e-user": "72000000-0000-4000-8000-000000000001" },
  });
  expect(deniedContent.status()).toBe(403);
  expect(await request.get(`${apiBase}/test-evidence-history-state`).then((response) => response.json()))
    .toMatchObject({ accessLogs: [] });

  await page.goto("/e2e/sale-order-payment-evidence-harness.html");
  await page.getByRole("button", { name: /2026-10-13.*45\.67/ }).click();
  const dialog = page.getByRole("dialog", { name: "Modificar pago" });
  await expect(dialog).toBeVisible();
  const historyToggle = dialog.getByRole("button", { name: "Ver historial (2)" });
  await expect(historyToggle).toBeVisible();
  await historyToggle.click();
  const oldRevision = dialog.getByRole("list", { name: "Versiones de evidencia del pago" })
    .getByRole("listitem").filter({ hasText: "comprobante-anterior.png" });
  await expect(oldRevision).toContainText("Anterior");
  const contentResponsePromise = page.waitForResponse((response) => response.url().includes(`/evidence/revisions/${prepared.oldAttachmentId}/content`));
  await oldRevision.getByRole("button", { name: "Ver evidencia" }).click();
  const contentResponse = await contentResponsePromise;
  expect(contentResponse.status()).toBe(200);
  const historicalImage = dialog.getByRole("img", { name: "Versión de evidencia del pago 1" });
  await expect(historicalImage).toHaveAttribute("src", /^blob:/);
  await expect(historicalImage).toHaveJSProperty("naturalWidth", 1);
  await expect(historicalImage).toHaveJSProperty("naturalHeight", 1);

  const after = await request.get(`${apiBase}/test-evidence-history-state`).then((response) => response.json());
  expect(after.accessLogs).toHaveLength(1);
  expect(after.accessLogs[0]).toMatchObject({
    income_id: prepared.incomeId,
    sale_order_id: "50000000-0000-4000-8000-000000000001",
    evidence_attachment_id: prepared.oldAttachmentId,
    actor_user_id: "70000000-0000-4000-8000-000000000001",
  });
  expect(after.accessLogs[0].content_sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(Number(after.accessLogs[0].size_bytes)).toBeGreaterThan(0);
});

test("recupera la carga de evidencia confirmada si Chromium pierde la respuesta y se recarga", async ({ page, request }) => {
  test.setTimeout(180_000);
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-income-evidence-upload`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, incomeId: "60000000-0000-4000-8000-000000000001" });
  await page.goto("/e2e/income-evidence-upload-harness.html");
  await expect(page.getByRole("dialog", { name: "Modificar pago" })).toBeVisible();

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cYNkAAAAASUVORK5CYII=", "base64");
  const chooseProof = () => page.getByLabel("Subir imagen").setInputFiles({ name: "comprobante-reintento.png", mimeType: "image/png", buffer: png });
  const idempotencyKeys: string[] = [];
  let committedResponseStatus = 0;
  await page.route("**/api/income/*/evidence", async (route) => {
    idempotencyKeys.push((await route.request().allHeaders())["idempotency-key"] ?? "");
    if (idempotencyKeys.length === 1) {
      const committed = await route.fetch();
      committedResponseStatus = committed.status();
      await route.abort("connectionreset");
      return;
    }
    await route.continue();
  });

  await chooseProof();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status").filter({ hasText: /respuesta de la carga de evidencia/i })).toBeVisible();
  expect(committedResponseStatus).toBe(201);
  const firstCommit = await request.get(`${apiBase}/test-income-evidence-upload-state`).then((response) => response.json());
  expect(firstCommit.attachments).toHaveLength(1);
  expect(firstCommit.operations).toHaveLength(1);
  expect(firstCommit.auditCount).toBe(1);
  expect(firstCommit.outboxCount).toBe(1);

  await page.reload();
  await expect(page.getByRole("dialog", { name: "Modificar pago" })).toBeVisible();
  await expect(page.getByTestId("income-version")).toHaveText("2");
  await expect(page.getByRole("status").filter({ hasText: /respuesta de la carga de evidencia/i })).toBeVisible();
  await chooseProof();
  const replayResponse = page.waitForResponse((response) => response.url().endsWith(`/api/income/${prepared.incomeId}/evidence`) && response.request().method() === "POST");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  expect((await replayResponse).status()).toBe(201);
  expect(idempotencyKeys).toHaveLength(2);
  expect(idempotencyKeys[0]).toMatch(/^[0-9a-f-]{36}$/i);
  expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);

  const after = await request.get(`${apiBase}/test-income-evidence-upload-state`).then((response) => response.json());
  expect(after.attachments).toHaveLength(1);
  expect(after.attachments[0]).toMatchObject({
    original_name: "comprobante-reintento.png",
    mime_type: "image/png",
    storage_path: expect.stringMatching(/^private\/sale-order-attachments\//),
    deleted_at: null,
  });
  expect(after.attachments[0].content_sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(after.attachments[0].upload_idempotency_key).toBe(idempotencyKeys[0]);
  expect(after.operations).toHaveLength(1);
  expect(after.operations[0]).toMatchObject({ status: "COMPLETED", attachment_id: after.attachments[0].id, staging_key: null, promoted_key: expect.any(String), lease_until: null });
  expect(after.operations[0].source_content_sha256).toBe(after.attachments[0].content_sha256);
  expect(after.auditCount).toBe(1);
  expect(after.outboxCount).toBe(1);
  expect(after.storedFileCount).toBe(1);
});

test("recupera una cancelación confirmada si Chromium pierde la respuesta y se recarga", async ({ page, request }) => {
  test.setTimeout(180_000);
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-cancel-order`).then((response) => response.json());
  await page.goto(`/e2e/cancellation-resolution-harness.html?order=${prepared.orderId}`, { waitUntil: "commit" });

  const pending = page.locator("section").filter({ hasText: "OP-CANCEL-PENDING" });
  const posted = page.locator("section").filter({ hasText: "Ingreso contabilizado" });
  await pending.getByLabel("Resolución").selectOption("CANCEL_PENDING");
  await posted.getByLabel("Resolución").selectOption("KEEP_AS_CREDIT");
  const pendingReason = pending.getByLabel(/Motivo/);
  const postedReason = posted.getByLabel(/Motivo/);
  await pendingReason.fill("Cancelar pendiente por cierre del pedido");
  await postedReason.fill("Conservar contabilizado como saldo");
  const confirmation = page.getByLabel(/Confirmo las resoluciones indicadas/);
  await confirmation.check();
  await expect(pendingReason).toHaveValue("Cancelar pendiente por cierre del pedido");
  await expect(postedReason).toHaveValue("Conservar contabilizado como saldo");
  await expect(confirmation).toBeChecked();
  await expect(page.getByRole("button", { name: "Resolver y cancelar pedido" })).toBeEnabled({ timeout: 10_000 });

  let committedBody = "";
  let lostResponse = false;
  await page.route("**/api/sale-orders/*/cancel", async (route) => {
    if (lostResponse) return route.continue();
    lostResponse = true;
    committedBody = route.request().postData() ?? "";
    const committed = await route.fetch();
    expect(committed.status()).toBe(200);
    await route.abort("connectionreset");
  });
  await page.getByRole("button", { name: "Resolver y cancelar pedido" }).click();
  await expect(page.getByRole("status")).toContainText("Se conservaron sus decisiones");
  expect(JSON.parse(committedBody).idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);

  await page.reload({ waitUntil: "commit" });
  await expect(page.getByRole("status")).toContainText("Se conservaron sus decisiones");
  await expect(page.getByLabel(/Motivo/).first()).toBeDisabled();
  const recoveredResponse = page.waitForResponse((response) => response.url().includes(`/sale-orders/${prepared.orderId}/cancel`));
  await page.getByRole("button", { name: "Reintentar cancelación segura" }).click();
  const response = await recoveredResponse;
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ saleOrderId: prepared.orderId, currentStateId: "90000000-0000-4000-8000-000000000002" });

  const after = await request.get(`${apiBase}/test-cancel-order-state`).then((result) => result.json());
  expect(after.payments).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "60000000-0000-4000-8000-000000000001", status: "POSTED", version: 2 }),
    expect.objectContaining({ id: "60000000-0000-4000-8000-000000000002", status: "CANCELLED", version: 2 }),
  ]));
  expect(after).toMatchObject({ auditEvents: 2, outboxEvents: 2, completedOperations: 1 });
});

test("recupera la cancelación sin pagos activos después de perder la respuesta y recargar", async ({ page, request }) => {
  test.setTimeout(180_000);
  const apiBase = process.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ?? "http://payments-api:3200";
  const prepared = await request.post(`${apiBase}/prepare-cancel-order-without-active-payments`).then((response) => response.json());
  expect(prepared).toMatchObject({ ready: true, orderId: "50000000-0000-4000-8000-000000000001" });
  await page.goto(`/e2e/cancellation-resolution-harness.html?order=${prepared.orderId}`, { waitUntil: "commit" });
  await expect(page.getByText(/No hay ingresos pendientes ni contabilizados/)).toBeVisible({ timeout: 15_000 });
  await page.getByLabel(/Confirmo las resoluciones indicadas/).check();

  const requestBodies: string[] = [];
  await page.route("**/api/sale-orders/*/cancel", async (route) => {
    requestBodies.push(route.request().postData() ?? "");
    if (requestBodies.length === 1) {
      const committed = await route.fetch();
      expect(committed.status()).toBe(200);
      await route.abort("connectionreset");
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Resolver y cancelar pedido" }).click();
  await expect(page.getByRole("status")).toContainText("Se conservaron sus decisiones");
  await page.reload({ waitUntil: "commit" });
  await expect(page.getByRole("status")).toContainText("Se conservaron sus decisiones");

  const recoveredResponse = page.waitForResponse((response) => response.url().includes(`/sale-orders/${prepared.orderId}/cancel`));
  await page.getByRole("button", { name: "Reintentar cancelación segura" }).click();
  expect((await recoveredResponse).status()).toBe(200);
  expect(requestBodies).toHaveLength(2);
  expect(JSON.parse(requestBodies[0]).idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
  expect(requestBodies[1]).toBe(requestBodies[0]);

  const after = await request.get(`${apiBase}/test-cancel-empty-state`).then((response) => response.json());
  expect(after).toMatchObject({
    currentStateId: "90000000-0000-4000-8000-000000000002",
    activePayments: 0,
    completedOperations: 1,
    auditEvents: 1,
    outboxEvents: 1,
  });
});
