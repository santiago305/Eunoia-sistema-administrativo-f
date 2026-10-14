import { expect, test } from "@playwright/test";

const harnessPath = "/e2e/payments-harness.html";

test("expone nombres accesibles y acciones correctas en los siete modos de pago", async ({ page }) => {
  await page.goto(harnessPath);

  const modeNavigation = page.getByRole("navigation", { name: "Seleccionar modo después de cerrar" });
  const modes = [
    { button: "Consultar contabilizado", title: "Detalle del ingreso", editable: false },
    { button: "Editar pendiente", title: "Modificar pago", editable: true },
    { button: "Crear pago", title: "Agregar pago", editable: true },
    { button: "Corregir contabilizado", title: "Corregir ingreso contabilizado", editable: true },
    { button: "Consultar cancelado", title: "Detalle del ingreso cancelado", editable: false },
    { button: "Consultar revertido", title: "Detalle del ingreso revertido", editable: false },
    { button: "Reingresar cobro", title: "Reingresar cobro", editable: true },
  ];

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Detalle del ingreso" })).toHaveCount(0);
  await expect(modeNavigation).toBeVisible();

  for (const mode of modes) {
    await modeNavigation.getByRole("button", { name: mode.button }).click();
    const dialog = page.getByRole("dialog", { name: mode.title, description: "Moneda PEN" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    for (const label of ["Monto", "Fecha de pago", "Método de cobro", "Cuenta receptora", "Número de operación", "Descripción"]) {
      const field = dialog.getByLabel(label);
      await expect(field).toBeVisible();
      if (mode.editable) await expect(field).toBeEnabled();
      else {
        await expect(field).toHaveAttribute("readonly", "");
        await expect(field).not.toBeDisabled();
      }
    }

    if (mode.title === "Corregir ingreso contabilizado" || mode.title === "Reingresar cobro") {
      await expect(dialog.getByLabel("Motivo")).toBeVisible();
    } else {
      if (!mode.editable) {
        for (const action of ["Guardar pago", "Guardar cambios", "Corregir ingreso", "Crear ingreso por confirmar"]) {
          await expect(dialog.getByRole("button", { name: action, exact: true })).toHaveCount(0);
        }
      }
    }

    await page.keyboard.press("Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(modeNavigation.getByRole("button", { name: mode.button })).toBeFocused();
  }
});

test("consulta un pago contabilizado en solo lectura y abre la evidencia en vista grande", async ({ page }) => {
  await page.goto(harnessPath);

  const paymentDialog = page.getByRole("dialog", { name: "Detalle del ingreso" });
  await expect(paymentDialog).toBeVisible();
  await expect(paymentDialog.getByLabel("Monto")).toHaveAttribute("readonly", "");
  await expect(paymentDialog.getByLabel("Fecha de pago")).toHaveAttribute("readonly", "");
  await expect(paymentDialog.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);

  const imageTrigger = paymentDialog.getByRole("button", { name: "Ver imagen grande" });
  await imageTrigger.focus();
  await page.keyboard.press("Enter");
  const imageDialog = page.getByRole("dialog", { name: "Evidencia del pago en tamaño completo" });
  await expect(imageDialog).toBeVisible();
  await expect(imageDialog.getByRole("img", { name: "Evidencia del pago 1" })).toBeVisible();
  const closeImage = imageDialog.getByRole("button", { name: "Cerrar imagen" });
  const downloadImage = imageDialog.getByRole("link", { name: "Descargar imagen" });
  await expect(closeImage).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(downloadImage).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeImage).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(downloadImage).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Cerrar imagen" })).toHaveCount(0);
  await expect(paymentDialog).toBeVisible();
  await expect(imageTrigger).toBeFocused();
});

test("reemplaza la evidencia desde el lápiz y envía el archivo junto con el pago", async ({ page }) => {
  await page.goto(harnessPath);
  await page.getByRole("dialog").getByRole("navigation", { name: "Modo de la prueba" }).getByRole("button", { name: "Editar pendiente" }).click();

  const editDialog = page.getByRole("dialog", { name: "Modificar pago" });
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel("Cambiar imagen").setInputFiles({
    name: "nuevo-comprobante.png",
    mimeType: "image/png",
    buffer: Buffer.from("browser-test-image"),
  });

  await expect(editDialog.getByText("Nueva evidencia: nuevo-comprobante.png")).toBeVisible();
  await expect(editDialog.getByRole("img", { name: "Evidencia del pago 1" })).toHaveAttribute("src", /^blob:/);
  await editDialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByTestId("submission-result")).toContainText('"amount":125.5');
  await expect(page.getByTestId("submission-result")).toContainText('"operationNumber":"OP-BROWSER-1"');
  await expect(page.getByTestId("submission-result")).toContainText('"fileName":"nuevo-comprobante.png"');
});

test("anuncia el duplicado y conserva abierto el editor del ingreso pendiente", async ({ page }) => {
  await page.goto(harnessPath);
  await page.getByRole("dialog").getByRole("navigation", { name: "Modo de la prueba" }).getByRole("button", { name: "Editar pendiente" }).click();
  const editDialog = page.getByRole("dialog", { name: "Modificar pago" });
  await editDialog.getByLabel("Número de operación").fill("OP-TAKEN");
  await editDialog.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(editDialog.getByRole("alert")).toHaveText("Ese número de operación ya está registrado.");
  await expect(editDialog.getByLabel("Monto")).toBeVisible();
  await expect(editDialog.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  await expect(page.getByTestId("submission-result")).toBeEmpty();
});

test("permite adjuntar evidencia al crear un pago que no tenía imagen", async ({ page }) => {
  await page.goto(harnessPath);
  await page.getByRole("dialog").getByRole("navigation", { name: "Modo de la prueba" }).getByRole("button", { name: "Crear pago" }).click();

  const createDialog = page.getByRole("dialog", { name: "Agregar pago" });
  await expect(createDialog.getByText("Subir imagen")).toBeVisible();
  await createDialog.getByLabel("Subir imagen").setInputFiles({
    name: "evidencia-inicial.webp",
    mimeType: "image/webp",
    buffer: Buffer.from("browser-test-image"),
  });
  await expect(createDialog.getByText("Nueva evidencia: evidencia-inicial.webp")).toBeVisible();
  await createDialog.getByRole("button", { name: "Guardar pago" }).click();
  await expect(page.getByTestId("submission-result")).toContainText('"fileName":"evidencia-inicial.webp"');
});

test("Ingresos conserva el lote de una fecha, lo prevalida y lo refresca al contabilizar", async ({ page }) => {
  const payments = [
    { incomeId: "income-day-2-a", saleOrderId: "order-day-2-a", saleOrderNumber: "SO-E2E-2026-001", clientName: "Cliente E2E", amount: 40, currency: "PEN", method: "TRANSFER", paymentMethodId: "method-1", paymentMethodCode: "BANK_TRANSFER", paymentMethodName: "Transferencia", companyPaymentAccountId: "account-1", companyPaymentAccountLabel: "Cuenta PEN", operationNumber: "OP-E2E-001", detail: "Pago de prueba", date: "2026-10-02T12:00:00.000Z", paymentDate: "2026-10-02", createdAt: "2026-10-02T12:00:00.000Z", evidenceUrl: null, status: "PENDING_CONFIRMATION", version: 1 },
    { incomeId: "income-day-2-b", saleOrderId: "order-day-2-b", saleOrderNumber: "SO-E2E-2026-002", clientName: "Cliente E2E", amount: 25, currency: "PEN", method: "TRANSFER", paymentMethodId: "method-1", paymentMethodCode: "BANK_TRANSFER", paymentMethodName: "Transferencia", companyPaymentAccountId: "account-1", companyPaymentAccountLabel: "Cuenta PEN", operationNumber: "OP-E2E-002", detail: "Pago de prueba", date: "2026-10-02T15:00:00.000Z", paymentDate: "2026-10-02", createdAt: "2026-10-02T15:00:00.000Z", evidenceUrl: null, status: "PENDING_CONFIRMATION", version: 1 },
    { incomeId: "income-day-3", saleOrderId: "order-day-3", saleOrderNumber: "SO-E2E-2026-003", clientName: "Cliente E2E", amount: 30, currency: "PEN", method: "TRANSFER", paymentMethodId: "method-1", paymentMethodCode: "BANK_TRANSFER", paymentMethodName: "Transferencia", companyPaymentAccountId: "account-1", companyPaymentAccountLabel: "Cuenta PEN", operationNumber: "OP-E2E-003", detail: "Pago de prueba", date: "2026-10-03T12:00:00.000Z", paymentDate: "2026-10-03", createdAt: "2026-10-03T12:00:00.000Z", evidenceUrl: null, status: "PENDING_CONFIRMATION", version: 1 },
    { incomeId: "income-posted", saleOrderId: "order-posted", saleOrderNumber: "SO-E2E-2026-004", clientName: "Cliente E2E", amount: 12, currency: "PEN", method: "TRANSFER", paymentMethodId: "method-1", paymentMethodCode: "BANK_TRANSFER", paymentMethodName: "Transferencia", companyPaymentAccountId: "account-1", companyPaymentAccountLabel: "Cuenta PEN", operationNumber: "OP-E2E-004", detail: "Pago de prueba", date: "2026-10-02T18:00:00.000Z", paymentDate: "2026-10-02", createdAt: "2026-10-02T18:00:00.000Z", evidenceUrl: null, status: "POSTED", version: 2 },
  ];
  let prevalidationRequests = 0;
  let postingBatchBody: Record<string, unknown> | null = null;
  await page.route((url) => /^\/(?:api\/)?income(?:\/|$)/.test(new URL(url).pathname), async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, "");
    if (request.method() === "GET" && path.endsWith("/income/summary")) {
      return route.fulfill({ json: { totalCollected: 12, totalPending: 95, ordersPaid: 0, ordersPending: 3, byMethod: [], byAccount: [] } });
    }
    if (request.method() === "GET" && path.endsWith("/income/search-state")) {
      return route.fulfill({ json: { recent: [], saved: [], catalogs: { methods: [], accounts: [] } } });
    }
    if (request.method() === "GET" && path.endsWith("/income")) {
      return route.fulfill({ json: { items: payments, total: payments.length } });
    }
    if (request.method() === "POST" && path.endsWith("/income/post-batch/prevalidate")) {
      prevalidationRequests += 1;
      return route.fulfill({ json: { canPost: true, paymentDate: "2026-10-02", count: 2, eligibleIds: ["income-day-2-a", "income-day-2-b"], errors: [], warnings: [], withEvidence: 0, withoutEvidence: 2, totalsByCurrency: { PEN: 65 } } });
    }
    if (request.method() === "POST" && path.endsWith("/income/post-batch")) {
      postingBatchBody = request.postDataJSON() as Record<string, unknown>;
      for (const payment of payments) {
        if (payment.incomeId === "income-day-2-a" || payment.incomeId === "income-day-2-b") payment.status = "POSTED";
      }
      return route.fulfill({ json: { type: "success", batchId: "e2e-batch-id", paymentDate: "2026-10-02", count: 2, totalsByCurrency: { PEN: 65 }, payments: [] } });
    }
    return route.fulfill({ status: 404, json: { message: `Unexpected request ${request.method()} ${path}` } });
  });

  await page.goto("/e2e/income-page-harness.html");
  await expect(page.getByText("SO-E2E-2026-001")).toBeVisible();
  await expect(page.getByText("SO-E2E-2026-003")).toBeVisible();

  const rowDay2A = page.getByRole("row").filter({ hasText: "SO-E2E-2026-001" });
  const rowDay2B = page.getByRole("row").filter({ hasText: "SO-E2E-2026-002" });
  const rowDay3 = page.getByRole("row").filter({ hasText: "SO-E2E-2026-003" });
  await rowDay2A.getByRole("button").first().click();
  await expect(page.getByRole("button", { name: "Contabilizar seleccionados (1)" })).toBeEnabled();
  await rowDay2B.getByRole("button").first().click();
  await expect(page.getByRole("button", { name: "Contabilizar seleccionados (2)" })).toBeEnabled();
  await rowDay3.getByRole("button").first().click();
  await expect(page.getByRole("button", { name: "Contabilizar seleccionados (2)" })).toBeVisible();

  await page.getByRole("button", { name: "Contabilizar seleccionados (2)" }).click();
  const confirmation = page.getByRole("dialog", { name: "Contabilizar ingresos" });
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByText("2026-10-02")).toBeVisible();
  await expect(confirmation.locator("dl")).toContainText("65");
  await expect(confirmation.getByText("Sin evidencia")).toBeVisible();
  expect(prevalidationRequests).toBe(1);

  await confirmation.getByRole("button", { name: "Contabilizar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Contabilizar seleccionados (0)" })).toBeDisabled();
  await expect(rowDay2A).toContainText("Contabilizado");
  await expect(rowDay2B).toContainText("Contabilizado");
  expect(postingBatchBody).toMatchObject({
    payments: [{ id: "income-day-2-a", version: 1 }, { id: "income-day-2-b", version: 1 }],
    confirmExcess: false,
  });
  expect(postingBatchBody?.idempotencyKey).toEqual(expect.any(String));
});

test("revierte un ingreso contabilizado con motivo, versión e idempotencia desde Ingresos", async ({ page }) => {
  const payment = {
    incomeId: "income-reversal-e2e", saleOrderId: "order-reversal-e2e", saleOrderNumber: "SO-E2E-REV-001", clientName: "Cliente E2E",
    amount: 85.25, currency: "PEN", method: "Transferencia", paymentMethodId: "method-1", paymentMethodCode: "BANK_TRANSFER", paymentMethodName: "Transferencia",
    companyPaymentAccountId: "account-1", companyPaymentAccountLabel: "Cuenta PEN", operationNumber: "OP-REV-001", detail: "Ingreso de prueba",
    date: "2026-10-02T12:00:00.000Z", paymentDate: "2026-10-02", createdAt: "2026-10-02T12:00:00.000Z", evidenceUrl: null,
    status: "POSTED", version: 3,
  };
  let reversalBody: Record<string, unknown> | null = null;
  await page.route((url) => /^\/(?:api\/)?income(?:\/|$)/.test(new URL(url).pathname), async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, "");
    if (request.method() === "GET" && path.endsWith("/income/summary")) {
      return route.fulfill({ json: { totalCollected: payment.status === "POSTED" ? 85.25 : 0, totalPending: 0, ordersPaid: 1, ordersPending: 0, byMethod: [], byAccount: [] } });
    }
    if (request.method() === "GET" && path.endsWith("/income/search-state")) {
      return route.fulfill({ json: { recent: [], saved: [], catalogs: { methods: [], accounts: [] } } });
    }
    if (request.method() === "GET" && path.endsWith("/income")) return route.fulfill({ json: { items: [payment], total: 1 } });
    if (request.method() === "POST" && path.endsWith("/income/income-reversal-e2e/reverse")) {
      reversalBody = request.postDataJSON() as Record<string, unknown>;
      payment.status = "REVERSED";
      payment.version += 1;
      return route.fulfill({ json: { message: "Ingreso revertido", status: "REVERSED", version: payment.version } });
    }
    return route.fulfill({ status: 404, json: { message: `Unexpected request ${request.method()} ${path}` } });
  });

  await page.goto("/e2e/income-page-harness.html?permissions=sale_orders.payments.reverse_posted");
  const row = page.getByRole("row").filter({ hasText: "SO-E2E-REV-001" });
  await expect(row).toContainText("Contabilizado");
  await row.getByRole("button", { name: "Acciones del ingreso SO-E2E-REV-001" }).click();
  await page.getByText("Revertir ingreso", { exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Revertir ingreso contabilizado" });
  await dialog.getByLabel("Motivo de anulación").fill("Número de operación no válido");
  await dialog.getByRole("button", { name: "Revertir ingreso" }).click();

  await expect(row).toContainText("Revertido");
  expect(reversalBody).toMatchObject({ version: 3, reason: "Número de operación no válido" });
  expect(reversalBody?.idempotencyKey).toEqual(expect.any(String));
});

test("resuelve cada pago antes de cancelar el pedido y conserva los contabilizados como crédito", async ({ page }) => {
  const payments = [
    { id: "income-cancel-pending", version: 1, status: "PENDING_CONFIRMATION", amount: 25, currency: "PEN", method: "Transferencia", operationNumber: "OP-PENDING", date: "2026-10-02", note: null, bankAccount: null, createdAt: "2026-10-02" },
    { id: "income-cancel-posted", version: 2, status: "POSTED", amount: 40, currency: "PEN", method: "Transferencia", operationNumber: "OP-POSTED", date: "2026-10-02", note: null, bankAccount: null, createdAt: "2026-10-02" },
  ];
  let cancellationBody: Record<string, unknown> | null = null;

  await page.route("**/sale-orders/order-cancel-e2e/payments", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: payments });
    return route.fulfill({ status: 405, json: { message: "Unexpected method" } });
  });
  await page.route("**/sale-orders/order-cancel-e2e/cancel", async (route) => {
    expect(route.request().method()).toBe("PATCH");
    cancellationBody = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ json: { saleOrderId: "order-cancel-e2e", currentStateId: "cancelled" } });
  });

  await page.goto("/e2e/cancellation-resolution-harness.html");
  const dialog = page.getByRole("dialog", { name: "Resolver pagos del pedido" });
  await expect(dialog.getByRole("heading", { name: "Ingreso por confirmar" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Ingreso contabilizado" })).toBeVisible();
  const paymentResolutions = dialog.locator("section select");
  await expect(paymentResolutions.nth(0)).toHaveValue("CANCEL_PENDING");
  await expect(paymentResolutions.nth(0).locator("option")).toHaveCount(1);
  await expect(paymentResolutions.nth(1)).toHaveValue("KEEP_AS_CREDIT");
  await expect(paymentResolutions.nth(1).locator("option")).toHaveCount(1);

  const submit = dialog.getByRole("button", { name: /Resolver y cancelar pedido/ });
  await expect(submit).toBeDisabled();
  await dialog.getByLabel("Motivo").nth(0).fill("Ingreso pendiente no recibido");
  await dialog.getByLabel("Motivo").nth(1).fill("Conservar como saldo del cliente");
  await expect(submit).toBeDisabled();
  await dialog.getByLabel(/Confirmo las resoluciones indicadas/).check();
  await submit.click();

  await expect(page.getByTestId("cancellation-result")).toHaveText("completed");
  expect(cancellationBody).toMatchObject({
    resolutions: [
      { incomeId: "income-cancel-pending", action: "CANCEL_PENDING", reason: "Ingreso pendiente no recibido" },
      { incomeId: "income-cancel-posted", action: "KEEP_AS_CREDIT", reason: "Conservar como saldo del cliente" },
    ],
  });
  expect(cancellationBody?.idempotencyKey).toEqual(expect.any(String));
});

test("al cancelar un pedido, un usuario autorizado solo registra la reserva pendiente del reembolso", async ({ page }) => {
  let cancellationBody: Record<string, unknown> | null = null;
  await page.route("**/sale-orders/order-refund-e2e/payments", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: [
        { id: "income-refund", version: 3, status: "POSTED", amount: 40, currency: "PEN", method: "Transferencia", operationNumber: "OP-REFUND", date: "2026-10-02", note: null, bankAccount: null, createdAt: "2026-10-02" },
      ] });
    }
    return route.fulfill({ status: 405, json: { message: "Unexpected method" } });
  });
  await page.route("**/sale-orders/order-refund-e2e/cancel", async (route) => {
    cancellationBody = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ json: { saleOrderId: "order-refund-e2e", currentStateId: "cancelled" } });
  });

  await page.goto("/e2e/cancellation-resolution-harness.html?permissions=customer_refunds.create&order=order-refund-e2e");
  await expect(page.getByTestId("harness-permissions")).toContainText("customer_refunds.create");
  await expect(page.getByTestId("can-create-refund")).toHaveText("true");
  const dialog = page.getByRole("dialog", { name: "Resolver pagos del pedido" });
  await expect(dialog.getByRole("heading", { name: "Ingreso contabilizado" })).toBeVisible();
  const resolution = dialog.locator("section select").first();
  await expect(resolution.locator("option[value=REFUND]")).toHaveCount(1);
  await resolution.selectOption("REFUND");
  await expect(dialog.getByText(/El reembolso queda pendiente/)).toBeVisible();
  await dialog.getByLabel("Importe a reembolsar (PEN)").fill("15.25");
  await dialog.getByLabel("Motivo").fill("Devolución parcial solicitada");
  await dialog.getByLabel(/Confirmo las resoluciones indicadas/).check();
  await dialog.getByRole("button", { name: /Resolver y cancelar pedido/ }).click();

  await expect(page.getByTestId("cancellation-result")).toHaveText("completed");
  expect(cancellationBody).toMatchObject({
    resolutions: [
      { incomeId: "income-refund", action: "REFUND", amount: 15.25, reason: "Devolución parcial solicitada" },
    ],
  });
});

test("transfiere un pendiente solo a un pedido destino compatible antes de cancelar", async ({ page }) => {
  let cancellationBody: Record<string, unknown> | null = null;
  await page.route("**/sale-orders/order-transfer-e2e/payments", async (route) => route.fulfill({ json: [
    { id: "income-transfer", version: 2, status: "PENDING_CONFIRMATION", amount: 25, currency: "PEN", method: "Transferencia", operationNumber: "OP-TRANSFER", date: "2026-10-02", note: null, bankAccount: null, createdAt: "2026-10-02" },
  ] }));
  await page.route("**/income/income-transfer/cancellation-targets", async (route) => route.fulfill({ json: [
    { saleOrderId: "order-target", saleOrderNumber: "SO-TARGET", clientName: "Cliente compatible", total: 100, available: 75, currency: "PEN" },
  ] }));
  await page.route("**/sale-orders/order-transfer-e2e/cancel", async (route) => {
    cancellationBody = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ json: { saleOrderId: "order-transfer-e2e", currentStateId: "cancelled" } });
  });

  await page.goto("/e2e/cancellation-resolution-harness.html?permissions=sale_orders.payments.transfer_pending&order=order-transfer-e2e");
  const dialog = page.getByRole("dialog", { name: "Resolver pagos del pedido" });
  const resolution = dialog.locator("section select").first();
  await resolution.selectOption("TRANSFER_PENDING");
  const target = dialog.getByLabel("Pedido destino");
  await expect(target.locator("option[value=order-target]")).toContainText("SO-TARGET");
  await target.selectOption("order-target");
  await dialog.getByLabel("Motivo").fill("Ingreso corresponde a otro pedido");
  await dialog.getByLabel(/Confirmo las resoluciones indicadas/).check();
  await dialog.getByRole("button", { name: /Resolver y cancelar pedido/ }).click();

  await expect(page.getByTestId("cancellation-result")).toHaveText("completed");
  expect(cancellationBody).toMatchObject({
    resolutions: [
      { incomeId: "income-transfer", action: "TRANSFER_PENDING", targetSaleOrderId: "order-target", reason: "Ingreso corresponde a otro pedido" },
    ],
  });
});

test("aplica saldo contabilizado al pedido compatible y limita el importe al disponible", async ({ page }) => {
  let cancellationBody: Record<string, unknown> | null = null;
  await page.route("**/sale-orders/order-apply-e2e/payments", async (route) => route.fulfill({ json: [
    { id: "income-apply", version: 4, status: "POSTED", amount: 40, currency: "PEN", method: "Transferencia", operationNumber: "OP-APPLY", date: "2026-10-02", note: null, bankAccount: null, createdAt: "2026-10-02" },
  ] }));
  await page.route("**/income/income-apply/cancellation-targets", async (route) => route.fulfill({ json: [
    { saleOrderId: "order-apply-target", saleOrderNumber: "SO-APPLY", clientName: "Cliente compatible", total: 100, available: 15, currency: "PEN" },
  ] }));
  await page.route("**/sale-orders/order-apply-e2e/cancel", async (route) => {
    cancellationBody = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ json: { saleOrderId: "order-apply-e2e", currentStateId: "cancelled" } });
  });

  await page.goto("/e2e/cancellation-resolution-harness.html?permissions=customer_credits.apply&order=order-apply-e2e");
  const dialog = page.getByRole("dialog", { name: "Resolver pagos del pedido" });
  const resolution = dialog.locator("section select").first();
  await resolution.selectOption("APPLY_TO_ORDER");
  await dialog.getByLabel("Pedido destino").selectOption("order-apply-target");
  const amount = dialog.getByLabel("Importe a aplicar (PEN)");
  await amount.fill("20");
  await dialog.getByLabel("Motivo").fill("Aplicar saldo disponible");
  await dialog.getByLabel(/Confirmo las resoluciones indicadas/).check();
  const submit = dialog.getByRole("button", { name: /Resolver y cancelar pedido/ });
  await expect(submit).toBeDisabled();
  await amount.fill("12.75");
  await submit.click();

  await expect(page.getByTestId("cancellation-result")).toHaveText("completed");
  expect(cancellationBody).toMatchObject({
    resolutions: [
      { incomeId: "income-apply", action: "APPLY_TO_ORDER", targetSaleOrderId: "order-apply-target", amount: 12.75, reason: "Aplicar saldo disponible" },
    ],
  });
});

test("confirma y revierte un reembolso con salida bancaria compensatoria sin borrar el historial", async ({ page }) => {
  let refundStatus = "PENDING";
  let postBody: Record<string, unknown> | null = null;
  let reverseBody: Record<string, unknown> | null = null;
  await page.route("**/income/income-refund-lifecycle/refunds", async (route) => route.fulfill({ json: {
    items: [{ id: "refund-lifecycle", amount: 22.5, currency: "PEN", status: refundStatus, operationNumber: refundStatus === "POSTED" ? "REFUND-OP-22" : null, reason: "Devolución acordada", createdByUserId: "user-1", postedByUserId: refundStatus === "POSTED" ? "user-2" : null, postedAt: null, reversedByUserId: null, reversedAt: null, createdAt: "2026-10-12", companyPaymentAccountId: refundStatus === "POSTED" ? "outflow-account" : null }],
    availableCredit: refundStatus === "PENDING" ? 30 : 7.5,
  } }));
  await page.route("**/company-payment-accounts/by-company/company-refund-e2e", async (route) => route.fulfill({ json: [
    { id: "outflow-account", companyId: "company-refund-e2e", type: "BANK_ACCOUNT", usage: "OUTFLOW", name: "Cuenta de salida", currency: "PEN", isActive: true, maskedLabel: "Banco ·••1234" },
  ] }));
  await page.route("**/income/refunds/refund-lifecycle/post", async (route) => {
    postBody = route.request().postDataJSON() as Record<string, unknown>;
    refundStatus = "POSTED";
    return route.fulfill({ json: { status: refundStatus } });
  });
  await page.route("**/income/refunds/refund-lifecycle/reverse", async (route) => {
    reverseBody = route.request().postDataJSON() as Record<string, unknown>;
    refundStatus = "REVERSED";
    return route.fulfill({ json: { status: refundStatus } });
  });

  await page.goto("/e2e/income-refund-lifecycle-harness.html");
  const dialog = page.getByRole("dialog", { name: "Reembolsos del ingreso" });
  await expect(dialog.getByText("Pendiente · Devolución acordada")).toBeVisible();
  await dialog.getByRole("button", { name: /Confirmar devolución/ }).click();
  await dialog.getByLabel("Cuenta de salida").selectOption("outflow-account");
  await dialog.getByRole("textbox", { name: "Número de operación" }).fill("REFUND-OP-22");
  await dialog.getByLabel(/Confirmo que revisé/).check();
  await dialog.getByRole("button", { name: "Confirmar operación" }).click();

  await expect(dialog.getByText("Devuelto · Devolución acordada")).toBeVisible();
  await dialog.getByRole("button", { name: "Revertir reembolso" }).click();
  await dialog.getByLabel("Motivo").fill("Cuenta destino incorrecta");
  await dialog.getByLabel(/Confirmo que revisé/).check();
  await dialog.getByRole("button", { name: "Confirmar operación" }).click();

  await expect(dialog.getByText("Revertido · Devolución acordada")).toBeVisible();
  expect(postBody).toMatchObject({ companyPaymentAccountId: "outflow-account", operationNumber: "REFUND-OP-22" });
  expect(postBody?.idempotencyKey).toEqual(expect.any(String));
  expect(reverseBody).toMatchObject({ reason: "Cuenta destino incorrecta" });
  expect(reverseBody?.idempotencyKey).toEqual(expect.any(String));
  await expect(page.getByTestId("refund-saved-count")).toHaveText("2");
});

test("recupera un reembolso confirmado tras perder la respuesta y recargar el navegador", async ({ page }) => {
  let refundStatus = "PENDING";
  const postBodies: Array<Record<string, unknown>> = [];
  await page.route("**/income/income-refund-lifecycle/refunds", async (route) => route.fulfill({ json: {
    items: [{ id: "refund-lost-response", amount: 22.5, currency: "PEN", status: refundStatus, operationNumber: refundStatus === "POSTED" ? "REFUND-OP-22" : null, reason: "Devolución acordada", createdByUserId: "user-1", postedByUserId: null, postedAt: null, reversedByUserId: null, reversedAt: null, createdAt: "2026-10-12", companyPaymentAccountId: refundStatus === "POSTED" ? "outflow-account" : null }],
    availableCredit: refundStatus === "PENDING" ? 30 : 7.5,
  } }));
  await page.route("**/company-payment-accounts/by-company/company-refund-e2e", async (route) => route.fulfill({ json: [
    { id: "outflow-account", companyId: "company-refund-e2e", type: "BANK_ACCOUNT", usage: "OUTFLOW", name: "Cuenta de salida", currency: "PEN", isActive: true, maskedLabel: "Banco ·••1234" },
  ] }));
  await page.route("**/income/refunds/refund-lost-response/post", async (route) => {
    postBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    refundStatus = "POSTED";
    if (postBodies.length === 1) return route.abort("failed");
    return route.fulfill({ json: { status: "POSTED" } });
  });

  await page.goto("/e2e/income-refund-lifecycle-harness.html");
  let dialog = page.getByRole("dialog", { name: "Reembolsos del ingreso" });
  await dialog.getByRole("button", { name: /Confirmar devolución/ }).click();
  await dialog.getByLabel("Cuenta de salida").selectOption("outflow-account");
  await dialog.getByRole("textbox", { name: "Número de operación" }).fill("REFUND-OP-22");
  await dialog.getByLabel(/Confirmo que revisé/).check();
  await dialog.getByRole("button", { name: "Confirmar operación" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toBeVisible();

  await page.reload();
  dialog = page.getByRole("dialog", { name: "Reembolsos del ingreso" });
  await expect(dialog.getByText("Devuelto · Devolución acordada")).toBeVisible();
  await dialog.getByRole("button", { name: "Recuperar operación pendiente" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toHaveCount(0);

  expect(postBodies).toHaveLength(2);
  expect(postBodies[1]).toEqual(postBodies[0]);
  expect(postBodies[0].idempotencyKey).toEqual(expect.any(String));
});

test("registra conciliación parcial desde una línea bancaria y desconcilia conservando auditoría", async ({ page }) => {
  let reconciledAmount = 0;
  let unreconciled = false;
  let lineCreated = false;
  const line = { id: "bank-line-e2e", companyPaymentAccountId: "inflow-account", bankReference: "BANK-REF-100", operationDate: "2026-10-02", amount: "100.00", currency: "PEN", available: "100.00" };
  let createLineBody: Record<string, unknown> | null = null;
  let reconcileBody: Record<string, unknown> | null = null;
  let unreconcileBody: Record<string, unknown> | null = null;

  await page.route("**/company-payment-accounts/by-company/company-reconciliation-e2e", async (route) => route.fulfill({ json: [
    { id: "inflow-account", companyId: "company-reconciliation-e2e", type: "BANK_ACCOUNT", usage: "INFLOW", name: "Cuenta receptora", currency: "PEN", isActive: true, maskedLabel: "Banco ·••4321" },
    { id: "other-account", companyId: "company-reconciliation-e2e", type: "BANK_ACCOUNT", usage: "INFLOW", name: "Otra cuenta", currency: "PEN", isActive: true, maskedLabel: "Otro banco ·••9876" },
  ] }));
  await page.route("**/income/income-reconciliation-e2e/reconciliation", async (route) => {
    if (route.request().method() === "GET") {
      const items = reconciledAmount > 0 ? [{ id: "allocation-e2e", amount: String(reconciledAmount), createdAt: "2026-10-12T12:00:00.000Z", unreconciledAt: unreconciled ? "2026-10-12T12:05:00.000Z" : null, unreconcileReason: unreconciled ? "Referencia bancaria incorrecta" : null, bankReference: line.bankReference, operationDate: line.operationDate, statementAmount: line.amount, currency: line.currency, companyPaymentAccountId: line.companyPaymentAccountId }] : [];
      return route.fulfill({ json: { items, reconciledAmount: unreconciled ? 0 : reconciledAmount, status: unreconciled || reconciledAmount === 0 ? "UNRECONCILED" : "PARTIALLY_RECONCILED" } });
    }
    reconcileBody = route.request().postDataJSON() as Record<string, unknown>;
    reconciledAmount = Number(reconcileBody.amount);
    unreconciled = false;
    return route.fulfill({ json: { id: "allocation-e2e" } });
  });
  await page.route("**/income/reconciliation/statement-lines**", async (route) => {
    if (route.request().method() === "POST") {
      createLineBody = route.request().postDataJSON() as Record<string, unknown>;
      lineCreated = true;
      return route.fulfill({ json: line });
    }
    return route.fulfill({ json: !lineCreated ? [] : unreconciled ? [{ ...line, available: "100.00" }] : [{ ...line, available: String(100 - reconciledAmount) }] });
  });
  await page.route("**/income/income-reconciliation-e2e/reconciliation/allocation-e2e/unreconcile", async (route) => {
    unreconcileBody = route.request().postDataJSON() as Record<string, unknown>;
    unreconciled = true;
    return route.fulfill({ json: { id: "allocation-e2e", unreconciledAt: "2026-10-12T12:05:00.000Z" } });
  });

  await page.goto("/e2e/income-reconciliation-harness.html");
  const dialog = page.getByRole("dialog", { name: "Conciliación bancaria" });
  await expect(dialog.getByText("Sin conciliar")).toBeVisible();
  const accountSelect = dialog.getByLabel("Cuenta receptora");
  await expect(accountSelect.locator("option")).toHaveCount(2);
  await expect(accountSelect.locator("option[value=other-account]")).toHaveCount(0);

  await dialog.getByText(/Registrar una línea bancaria manualmente/).click();
  await dialog.getByLabel("Referencia bancaria").fill("BANK-REF-100");
  await dialog.getByLabel(/Fecha de operación/).fill("2026-10-02");
  await dialog.getByLabel(/Importe de la línea/).fill("100");
  await dialog.getByRole("button", { name: /Registrar línea/ }).click();
  await dialog.getByLabel(/Línea bancaria disponible/).selectOption("bank-line-e2e");
  const amount = dialog.getByLabel("Importe a conciliar (PEN)");
  await amount.fill("60.5");
  await dialog.getByRole("button", { name: "Conciliar importe" }).click();

  await expect(dialog.getByText("Conciliación parcial")).toBeVisible();
  await expect(dialog.getByText(/BANK-REF-100/).last()).toBeVisible();
  await expect(dialog.getByText(/60\.50/).last()).toBeVisible();
  await dialog.getByRole("button", { name: "Desconciliar" }).click();
  await dialog.getByLabel(/Motivo de desconciliación/).fill("Referencia bancaria incorrecta");
  await dialog.getByLabel(/Confirmo retirar esta asignación/).check();
  await dialog.getByRole("button", { name: /Confirmar desconciliación/ }).click();

  await expect(dialog.getByText("Sin conciliar")).toBeVisible();
  await expect(dialog.getByText("Desconciliada")).toBeVisible();
  await expect(dialog.getByText("Motivo: Referencia bancaria incorrecta")).toBeVisible();
  expect(createLineBody).toMatchObject({ companyPaymentAccountId: "inflow-account", bankReference: "BANK-REF-100", amount: 100, currency: "PEN" });
  expect(reconcileBody).toMatchObject({ bankStatementLineId: "bank-line-e2e", amount: 60.5 });
  expect(reconcileBody?.idempotencyKey).toEqual(expect.any(String));
  expect(unreconcileBody).toMatchObject({ reason: "Referencia bancaria incorrecta" });
  expect(unreconcileBody?.idempotencyKey).toEqual(expect.any(String));
  await expect(page.getByTestId("reconciliation-saved-count")).toHaveText("2");
});

test("recupera una conciliación después de perder la respuesta y recargar el navegador", async ({ page }) => {
  let reconciledAmount = 0;
  const reconcileBodies: Array<Record<string, unknown>> = [];
  const line = { id: "bank-line-recovery", companyPaymentAccountId: "inflow-account", bankReference: "BANK-RECOVERY", operationDate: "2026-10-02", amount: "100.00", currency: "PEN", available: "100.00" };
  await page.route("**/company-payment-accounts/by-company/company-reconciliation-e2e", async (route) => route.fulfill({ json: [
    { id: "inflow-account", companyId: "company-reconciliation-e2e", type: "BANK_ACCOUNT", usage: "INFLOW", name: "Cuenta receptora", currency: "PEN", isActive: true, maskedLabel: "Banco ·••4321" },
  ] }));
  await page.route("**/income/income-reconciliation-e2e/reconciliation", async (route) => {
    if (route.request().method() === "GET") {
      const items = reconciledAmount > 0 ? [{ id: "allocation-recovery", amount: String(reconciledAmount), createdAt: "2026-10-12T12:00:00.000Z", unreconciledAt: null, unreconcileReason: null, bankReference: line.bankReference, operationDate: line.operationDate, statementAmount: line.amount, currency: line.currency, companyPaymentAccountId: line.companyPaymentAccountId }] : [];
      return route.fulfill({ json: { items, reconciledAmount, status: reconciledAmount > 0 ? "PARTIALLY_RECONCILED" : "UNRECONCILED" } });
    }
    reconcileBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    reconciledAmount = Number(reconcileBodies.at(-1)?.amount ?? 0);
    if (reconcileBodies.length === 1) return route.abort("failed");
    return route.fulfill({ json: { id: "allocation-recovery" } });
  });
  await page.route("**/income/reconciliation/statement-lines**", async (route) => route.fulfill({ json: [{ ...line, available: (100 - reconciledAmount).toFixed(2) }] }));

  await page.goto("/e2e/income-reconciliation-harness.html");
  let dialog = page.getByRole("dialog", { name: "Conciliación bancaria" });
  await dialog.getByLabel("Línea bancaria disponible").selectOption("bank-line-recovery");
  await dialog.getByLabel("Importe a conciliar (PEN)").fill("60.50");
  await dialog.getByRole("button", { name: "Conciliar importe" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toBeVisible();

  await page.reload();
  dialog = page.getByRole("dialog", { name: "Conciliación bancaria" });
  await expect(dialog.getByText("Conciliación parcial")).toBeVisible();
  await dialog.getByRole("button", { name: "Recuperar operación pendiente" }).click();
  await expect(dialog.getByRole("region", { name: "Operaciones por recuperar" })).toHaveCount(0);

  expect(reconcileBodies).toHaveLength(2);
  expect(reconcileBodies[1]).toEqual(reconcileBodies[0]);
  expect(reconcileBodies[0].idempotencyKey).toEqual(expect.any(String));
});

test("el informe bancario filtra por fecha/cuenta y separa PEN y USD", async ({ page }) => {
  let reportQuery: URLSearchParams | null = null;
  await page.route("**/company-payment-accounts/by-company/company-report-e2e", async (route) => route.fulfill({ json: [
    { id: "pen-account", companyId: "company-report-e2e", type: "BANK_ACCOUNT", usage: "INFLOW", name: "Cuenta PEN", currency: "PEN", isActive: true, maskedLabel: "Banco ·••1234" },
  ] }));
  await page.route("**/income/reconciliation/report**", async (route) => {
    reportQuery = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: {
      from: "2026-10-01", to: "2026-10-12", truncated: true,
      totalsByCurrency: {
        PEN: { statementAmount: 100, reconciledAmount: 70, availableAmount: 30, lineCount: 1 },
        USD: { statementAmount: 50, reconciledAmount: 20, availableAmount: 30, lineCount: 1 },
      },
      items: [
        { id: "line-pen", accountName: "Cuenta PEN", bankReference: "REPORT-PEN-1", operationDate: "2026-10-02", currency: "PEN", amount: "100.00", reconciledAmount: "70.00", availableAmount: "30.00", status: "PARTIALLY_RECONCILED", activeAllocationCount: 1 },
        { id: "line-usd", accountName: "Cuenta USD", bankReference: "REPORT-USD-1", operationDate: "2026-10-03", currency: "USD", amount: "50.00", reconciledAmount: "20.00", availableAmount: "30.00", status: "PARTIALLY_RECONCILED", activeAllocationCount: 1 },
      ],
    } });
  });

  await page.goto("/e2e/bank-reconciliation-report-harness.html");
  const dialog = page.getByRole("dialog", { name: "Informe de conciliación bancaria" });
  await dialog.getByLabel("Desde").fill("2026-10-01");
  await dialog.getByLabel("Hasta").fill("2026-10-12");
  await dialog.getByLabel("Cuenta receptora").selectOption("pen-account");
  await dialog.getByRole("button", { name: "Generar informe" }).click();

  await expect(dialog.getByRole("heading", { name: /Totales PEN/ })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Totales USD/ })).toBeVisible();
  await expect(dialog.getByText("REPORT-PEN-1")).toBeVisible();
  await expect(dialog.getByText("REPORT-USD-1")).toBeVisible();
  await expect(dialog.getByRole("status")).toContainText("2,000");
  expect(reportQuery?.get("from")).toBe("2026-10-01");
  expect(reportQuery?.get("to")).toBe("2026-10-12");
  expect(reportQuery?.get("companyPaymentAccountId")).toBe("pen-account");
});

test("exporta Excel de ingresos con columnas y perÃ­odo aplicados", async ({ page }) => {
  let exportBody: Record<string, unknown> | null = null;
  await page.route((url) => /^\/(?:api\/)?income(?:\/|$)/.test(new URL(url).pathname), async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, "");
    if (request.method() === "GET" && path.endsWith("/income/summary")) {
      return route.fulfill({ json: { totalCollected: 0, totalPending: 0, ordersPaid: 0, ordersPending: 0, byMethod: [], byAccount: [] } });
    }
    if (request.method() === "GET" && path.endsWith("/income/search-state")) {
      return route.fulfill({ json: { recent: [], saved: [], catalogs: { methods: [], accounts: [] } } });
    }
    if (request.method() === "GET" && path.endsWith("/income")) return route.fulfill({ json: { items: [], total: 0 } });
    if (request.method() === "POST" && path.endsWith("/income/export-excel")) {
      exportBody = request.postDataJSON() as Record<string, unknown>;
      return route.fulfill({
        status: 200,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: Buffer.from("isolated-e2e-xlsx"),
      });
    }
    return route.fulfill({ status: 404, json: { message: `Unexpected request ${request.method()} ${path}` } });
  });

  await page.goto("/e2e/income-page-harness.html?permissions=income.export");
  await page.getByLabel("Buscar ingreso...").fill("SO-E2E-EXPORT-42");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: "Exportar", exact: true }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^ingresos-\d{4}-\d{2}-01-\d{4}-\d{2}-\d{2}\.xlsx$/);
  expect(exportBody).toMatchObject({
    from: expect.stringMatching(/^\d{4}-\d{2}-01$/),
    to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    q: "SO-E2E-EXPORT-42",
  });
  const exportedColumnKeys = (exportBody?.columns as Array<{ key: string }>).map((column) => column.key);
  expect(exportedColumnKeys).toEqual(expect.arrayContaining([
    "paymentDate",
    "financialStatus",
    "reconciliationStatus",
    "evidence",
  ]));
});

test("oculta el control de exportacion cuando falta income.export", async ({ page }) => {
  await page.route("**/income/summary", async (route) => route.fulfill({ json: {
    totalCollected: 0, totalPending: 0, ordersPaid: 0, ordersPending: 0, byMethod: [], byAccount: [],
  } }));
  await page.route("**/income/search-state", async (route) => route.fulfill({ json: {
    recent: [], saved: [], catalogs: { methods: [], accounts: [] },
  } }));
  await page.route(/\/income(?:\?.*)?$/, async (route) => route.fulfill({ json: { items: [], total: 0 } }));

  await page.goto("/e2e/income-page-harness.html");
  await expect(page.getByRole("button", { name: "Exportar", exact: true })).toHaveCount(0);
});

test("correccion y reingreso usan la modal compartida con motivo y evidencia de reemplazo", async ({ page }) => {
  await page.goto(harnessPath);
  const dialog = page.getByRole("dialog", { name: "Detalle del ingreso" });

  await dialog.getByRole("button", { name: "Corregir contabilizado" }).click();
  const correction = page.getByRole("dialog", { name: "Corregir ingreso contabilizado" });
  await expect(correction.getByLabel("Monto")).toBeEnabled();
  await correction.getByLabel("Motivo").fill("Corregir operacion bancaria");
  await correction.getByLabel("Cambiar imagen").setInputFiles({
    name: "evidencia-corregida.png",
    mimeType: "image/png",
    buffer: Buffer.from("corrected-evidence"),
  });
  await correction.getByRole("button", { name: "Corregir ingreso" }).click();
  await expect(page.getByTestId("submission-result")).toContainText('"mode":"correct-posted"');
  await expect(page.getByTestId("submission-result")).toContainText('"fileName":"evidencia-corregida.png"');

  await correction.getByRole("button", { name: "Reingresar cobro" }).click();
  const reentry = page.getByRole("dialog", { name: "Reingresar cobro" });
  await expect(reentry.getByLabel("Monto")).toBeEnabled();
  await reentry.getByLabel("Motivo").fill("Registrar nuevamente el cobro");
  await reentry.getByRole("button", { name: "Crear ingreso por confirmar" }).click();
  await expect(page.getByTestId("submission-result")).toContainText('"mode":"reenter"');
  await expect(page.getByTestId("submission-result")).toContainText('"reason":"Registrar nuevamente el cobro"');
});

test("los ingresos cancelados y revertidos permanecen estrictamente de solo lectura", async ({ page }) => {
  await page.goto(harnessPath);
  await page.getByRole("dialog", { name: "Detalle del ingreso" }).getByRole("button", { name: "Consultar cancelado" }).click();
  let dialog = page.getByRole("dialog", { name: "Detalle del ingreso cancelado" });
  await expect(dialog.getByText("Cancelado", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Monto")).toHaveAttribute("readonly", "");
  await expect(dialog.getByLabel("Monto")).not.toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);

  await dialog.getByRole("button", { name: "Consultar revertido" }).click();
  dialog = page.getByRole("dialog", { name: "Detalle del ingreso revertido" });
  await expect(dialog.getByText("Revertido", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Monto")).toHaveAttribute("readonly", "");
  await expect(dialog.getByLabel("Monto")).not.toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
});
