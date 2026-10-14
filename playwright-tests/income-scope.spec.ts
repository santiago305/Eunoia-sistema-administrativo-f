import { expect, test } from "@playwright/test";

const harnessPath = "/e2e/income-scope-harness.html";
const targetUserId = "71000000-0000-4000-8000-000000000001";
const options = {
  subsidiaries: [{ id: "branch-1", label: "Sede Centro" }],
  paymentAccounts: [{ id: "account-1", label: "Banco terminado en 1234" }],
  clients: [{ id: "client-1", label: "Cliente Uno" }],
};

test("solo quien tiene income.scope.manage ve y abre la administracion de alcances", async ({ page }) => {
  let scopeRequests = 0;
  await page.route("**/income/admin/**", async (route) => {
    scopeRequests += 1;
    await route.fulfill({ status: 403, json: { message: "Forbidden" } });
  });

  await page.goto(`${harnessPath}?canManage=false`);
  await expect(page.getByRole("button", { name: "Alcance de ingresos" })).toHaveCount(0);
  expect(scopeRequests).toBe(0);

  await page.goto(`${harnessPath}?canManage=true`);
  await page.getByRole("button", { name: "Alcance de ingresos" }).click();
  await expect(page.getByRole("dialog", { name: "Alcance de ingresos" })).toBeVisible();
  await expect(page.getByText(/Ver todos no se concede desde aqu[ií]/)).toBeVisible();
  expect(scopeRequests).toBe(2);
});

test("carga, reemplaza y persiste alcances de sucursal, cuenta y cliente", async ({ page }) => {
  let patchBody: { assignments?: Array<{ type: string; id: string }> } | null = null;
  await page.route("**/income/admin/data-scope/options", (route) => route.fulfill({ json: options }));
  await page.route(`**/income/admin/users/${targetUserId}/data-scope`, async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: [{ type: "SUBSIDIARY", id: "branch-1" }] });
    }
    if (route.request().method() === "PATCH") {
      patchBody = route.request().postDataJSON();
      return route.fulfill({ json: { userId: targetUserId, assignments: patchBody?.assignments ?? [] } });
    }
    return route.fulfill({ status: 405 });
  });

  await page.goto(`${harnessPath}?canManage=true`);
  await page.getByRole("button", { name: "Alcance de ingresos" }).click();
  const dialog = page.getByRole("dialog", { name: "Alcance de ingresos" });
  await expect(dialog.getByLabel("Sede Centro")).toBeChecked();
  await dialog.getByLabel("Sede Centro").uncheck();
  await dialog.getByLabel("Banco terminado en 1234").check();
  await dialog.getByLabel("Cliente Uno").check();
  await dialog.getByRole("button", { name: "Guardar alcance" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Alcance guardado");
  expect(patchBody).toEqual({ assignments: [
    { type: "PAYMENT_ACCOUNT", id: "account-1" },
    { type: "CLIENT", id: "client-1" },
  ] });
});

test("mantiene abierta la modal y muestra un error claro si el API rechaza el guardado", async ({ page }) => {
  await page.route("**/income/admin/data-scope/options", (route) => route.fulfill({ json: options }));
  await page.route(`**/income/admin/users/${targetUserId}/data-scope`, async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: [] });
    return route.fulfill({ status: 403, json: { message: "Forbidden" } });
  });

  await page.goto(`${harnessPath}?canManage=true`);
  await page.getByRole("button", { name: "Alcance de ingresos" }).click();
  const dialog = page.getByRole("dialog", { name: "Alcance de ingresos" });
  await dialog.getByRole("button", { name: "Guardar alcance" }).click();

  await expect(dialog.getByRole("alert")).toContainText("No se guardaron los cambios");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test.skip(process.env.INCOME_SCOPE_HTTP_INTEGRATION !== "1", "Requiere la red Docker con PostgreSQL efímero y el IncomeController real.");

test("administra alcances UI→IncomeController→PostgreSQL y rechaza a un actor sin permiso", async ({ page, request }) => {
  const configuredApiBase = process.env.VITE_API_BASE_URL;
  const defaultApiOrigin = configuredApiBase
    ? new URL(configuredApiBase).origin
    : "http://host.docker.internal:3200";
  const scopeApiUrl = new URL(defaultApiOrigin);
  scopeApiUrl.port = "3201";
  const apiBase = process.env.INCOME_SCOPE_HTTP_API_URL ?? `${scopeApiUrl.origin}/api`;
  const stateUrl = process.env.INCOME_SCOPE_TEST_STATE_URL
    ?? `${defaultApiOrigin.replace(/\/$/, "")}/test-scope-state`;
  const reset = await request.delete(`${stateUrl}/${targetUserId}`);
  expect(reset.status()).toBe(204);
  const initial = await request.get(`${stateUrl}?userId=${targetUserId}`).then((response) => response.json());
  expect(initial).toEqual({ scopes: [], audits: [] });

  await page.route("**/income/admin/**", async (route) => {
    const original = new URL(route.request().url());
    const path = original.pathname.replace(/^\/api(?=\/)/, "");
    const target = `${apiBase.replace(/\/$/, "")}${path}${original.search}`;
    await route.continue({ url: target });
  });
  await page.goto(`${harnessPath}?canManage=true`);
  await page.getByRole("button", { name: "Alcance de ingresos" }).click();
  const dialog = page.getByRole("dialog", { name: "Alcance de ingresos" });
  await expect(dialog.getByLabel("Sede Centro")).toBeVisible();
  await dialog.getByLabel("Sede Centro").check();
  await dialog.getByLabel("Banco terminado en 0001").check();
  await dialog.getByLabel("Cliente alternativo").check();
  await dialog.getByRole("button", { name: "Guardar alcance" }).click();
  await expect(page.getByRole("status")).toHaveText("Alcance guardado");

  const persisted = await request.get(`${stateUrl}?userId=${targetUserId}`).then((response) => response.json());
  expect(persisted.scopes).toEqual([
    { type: "CLIENT", id: "40000000-0000-4000-8000-000000000002" },
    { type: "PAYMENT_ACCOUNT", id: "20000000-0000-4000-8000-000000000001" },
    { type: "SUBSIDIARY", id: "90000000-0000-4000-8000-000000000001" },
  ]);
  expect(persisted.audits).toHaveLength(1);
  expect(persisted.audits[0]).toMatchObject({
    actor_user_id: "70000000-0000-4000-8000-000000000001",
    before_scopes: [],
    after_scopes: persisted.scopes,
  });

  await page.route("**/income/admin/**", async (route) => {
    const original = new URL(route.request().url());
    const path = original.pathname.replace(/^\/api(?=\/)/, "");
    const target = `${apiBase.replace(/\/$/, "")}${path}${original.search}`;
    await route.continue({
      url: target,
      headers: { ...route.request().headers(), "x-e2e-user": "72000000-0000-4000-8000-000000000001" },
    });
  });
  await page.goto(`${harnessPath}?canManage=true`);
  await page.getByRole("button", { name: "Alcance de ingresos" }).click();
  await expect(page.getByRole("dialog", { name: "Alcance de ingresos" }).getByRole("alert"))
    .toContainText("No se pudieron cargar los alcances");
  const unchanged = await request.get(`${stateUrl}?userId=${targetUserId}`).then((response) => response.json());
  expect(unchanged).toEqual(persisted);
});
