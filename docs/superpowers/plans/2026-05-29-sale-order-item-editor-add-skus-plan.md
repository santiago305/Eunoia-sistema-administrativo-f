# Sale Order Item Editor: Add Catalog SKUs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir buscar/listar SKUs del catálogo (como Out Orders) y agregarlos a `value.components` en `SaleOrderItemEditorModal`, prellenando `unitPrice` desde `sku.price` cuando exista.

**Architecture:** Extraer un modal dedicado (`SaleOrderAddSkuModal`) que encapsule búsqueda (`listSkus`) + formulario (skuId/qty/price) y reporte el componente seleccionado al editor. El editor mantiene cache de labels/precio por `skuId` para renderizar componentes no pertenecientes al pack.

**Tech Stack:** React 19 + TypeScript + Vitest + Testing Library, UI local (`Modal`, `FloatingSelect`, `FloatingInput`, `SystemButton`), servicios REST (`listSkus`).

---

## File Structure

- Create: `src/features/sale-orders/components/SaleOrderAddSkuModal.tsx`
  - Responsabilidad: UI + lógica de búsqueda de SKUs (`listSkus`) y captura de `quantity`/`unitPrice` para agregar.
- Modify: `src/features/sale-orders/components/SaleOrderItemEditorModal.tsx`
  - Responsabilidad: abrir modal, integrar “add sku” en `components`, recalcular totales, cachear labels.
- Test: `src/features/sale-orders/components/SaleOrderItemEditorModal.spec.tsx`
  - Cobertura: “precio prellenado desde catálogo” y “agregar agrega fila + recalcula total”.

---

### Task 1: Add SKU Modal component (UI + listSkus contract)

**Files:**
- Create: `src/features/sale-orders/components/SaleOrderAddSkuModal.tsx`

- [ ] **Step 1: Create `SaleOrderAddSkuModal` with search + qty/price + prefill from `sku.price`**

```tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { FloatingInput } from "@/shared/components/components/FloatingInput";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { parseDecimalInput } from "@/shared/utils/functionPurchases";
import { listSkus } from "@/shared/services/skuService";
import type { ProductSkuWithAttributes } from "@/features/catalog/types/product";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";

export type SaleOrderAddSkuSelection = {
  skuId: string;
  label: string;
  unitPrice: number;
  quantity: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (selection: SaleOrderAddSkuSelection) => void;
};

const buildSkuLabel = (item: ProductSkuWithAttributes) => {
  const name = (item.sku?.name ?? "SKU").trim() || "SKU";
  const attrsText = (item.attributes ?? [])
    .map((attr) => (attr.value ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const skuPart = item.sku?.backendSku ? ` -${item.sku.backendSku}` : "";
  const customPart = item.sku?.customSku ? ` (${item.sku.customSku})` : "";
  const attrsPart = attrsText ? ` ${attrsText}` : "";
  return `${name}${attrsPart}${skuPart}${customPart}`.trim();
};

type SkuOption = { value: string; label: string; price?: number };

export function SaleOrderAddSkuModal({ open, onClose, onAdd }: Props) {
  const [skuId, setSkuId] = useState("");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SkuOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [quantityText, setQuantityText] = useState("1");
  const [priceText, setPriceText] = useState("");

  const selectedOption = useMemo(() => options.find((o) => o.value === skuId) ?? null, [options, skuId]);

  const reset = () => {
    setSkuId("");
    setQuery("");
    setOptions([]);
    setQuantityText("1");
    setPriceText("");
  };

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await listSkus({
        q: q.trim() || undefined,
        productType: ProductTypes.PRODUCT,
        isActive: true,
        page: 1,
        limit: 10,
      });
      const items = (res.items ?? []) as ProductSkuWithAttributes[];
      setOptions(
        items.map((item) => ({
          value: item.sku.id,
          label: buildSkuLabel(item),
          price: Number(item.sku.price ?? 0),
        })),
      );
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => void load(query), query.trim() ? 350 : 0);
    return () => window.clearTimeout(id);
  }, [load, open, query]);

  useEffect(() => {
    if (!open) return;
    if (!skuId) return;
    if (priceText.trim()) return;
    const price = selectedOption?.price;
    if (price == null) return;
    setPriceText(String(price));
  }, [open, priceText, selectedOption?.price, skuId]);

  const submit = () => {
    const quantity = parseDecimalInput(quantityText);
    const unitPrice = parseDecimalInput(priceText || String(selectedOption?.price ?? 0));
    if (!skuId) return;
    if (quantity <= 0) return;
    if (unitPrice < 0) return;

    onAdd({
      skuId,
      label: selectedOption?.label ?? skuId,
      quantity,
      unitPrice,
    });
    reset();
  };

  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Agregar SKU"
      className="max-w-xl"
    >
      <div className="p-4 space-y-3">
        <FloatingSelect
          label="Producto"
          name="sale-order-add-sku"
          value={skuId}
          onChange={(next) => {
            setSkuId(next);
            setPriceText("");
          }}
          options={options.map(({ value, label }) => ({ value, label }))}
          searchable
          searchPlaceholder="Buscar producto..."
          emptyMessage={loading ? "Cargando..." : "Sin productos"}
          onSearchChange={setQuery}
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FloatingInput
            label="Cantidad"
            name="sale-order-add-sku-qty"
            type="number"
            min={0}
            step="0.001"
            value={quantityText}
            onChange={(e) => setQuantityText(e.target.value)}
          />
          <FloatingInput
            label="Precio unit."
            name="sale-order-add-sku-price"
            type="number"
            min={0}
            step="0.01"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
          />
        </div>
      </div>

      <div className="p-4 border-t flex justify-end gap-2">
        <SystemButton
          variant="outline"
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Cancelar
        </SystemButton>
        <SystemButton leftIcon={<Plus className="h-4 w-4" />} onClick={submit}>
          Agregar
        </SystemButton>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Run: `pnpm.cmd dev`
Expected: modal renders; search input appears when opening select; add returns selection.

- [ ] **Step 3: Commit**

```bash
git add src/features/sale-orders/components/SaleOrderAddSkuModal.tsx
git commit -m "feat(sale-orders): add modal to select catalog SKU"
```

---

### Task 2: Integrate Add SKU into SaleOrderItemEditorModal

**Files:**
- Modify: `src/features/sale-orders/components/SaleOrderItemEditorModal.tsx`

- [ ] **Step 1: Add cache for SKU labels/prices**

Add near state declarations:

```tsx
const [skuMetaById, setSkuMetaById] = useState<Record<string, { label: string; price?: number }>>({});
```

- [ ] **Step 2: Replace stub modal with SaleOrderAddSkuModal**

Import:

```tsx
import { SaleOrderAddSkuModal } from "@/features/sale-orders/components/SaleOrderAddSkuModal";
```

Replace the current stub:

```tsx
<SaleOrderAddSkuModal
  open={openAddSku}
  onClose={() => setOpenAddSku(false)}
  onAdd={({ skuId, label, quantity, unitPrice }) => {
    setSkuMetaById((prev) => ({ ...prev, [skuId]: { label, price: unitPrice } }));
    setExcludedSkuIds((prev) => prev.filter((id) => id !== skuId));

    const total = calcTotal(quantity, unitPrice);
    const nextComponent: SaleOrderItemComponentInput = {
      skuId,
      quantity,
      unitPrice,
      total,
      referencePackItemId: undefined,
    };
    const components = upsertComponent(value.components ?? [], nextComponent);
    onChange(recalcParentFromComponents(value, components));
    setOpenAddSku(false);
  }}
/>
```

- [ ] **Step 3: Update label resolution for non-pack SKUs**

In `componentRows` mapping, when `packItem` is not found:

```tsx
const cached = skuMetaById[component.skuId ?? ""];
label: packItem ? buildSkuLabelFromDetailItem(packItem) : (cached?.label ?? component.skuId),
```

Also include `skuMetaById` in the `useMemo` dependency list for `componentRows`.

- [ ] **Step 4: Disable `+` if no pack selected**

Update `SystemButton` for `+`:

```tsx
<SystemButton
  size="sm"
  leftIcon={<Plus className="h-4 w-4" />}
  disabled={!hasPack}
  title={!hasPack ? "Selecciona un pack para agregar SKUs" : "Agregar SKU"}
  onClick={() => setOpenAddSku(true)}
/>
```

- [ ] **Step 5: Manual verification**

Run: `pnpm.cmd dev`
Expected:
- With pack selected, `+` opens modal, selecting SKU pre-fills price, clicking Agregar adds row.
- Total/Precio unit. del item se recalcula desde componentes.

- [ ] **Step 6: Commit**

```bash
git add src/features/sale-orders/components/SaleOrderItemEditorModal.tsx
git commit -m "feat(sale-orders): add catalog SKUs into item components"
```

---

### Task 3: Add component-level test for add SKU flow (Vitest + Testing Library)

**Files:**
- Test: `src/features/sale-orders/components/SaleOrderItemEditorModal.spec.tsx`
- Modify (mock helpers only if needed): `test/vitest.setup.ts` (avoid unless necessary)

- [ ] **Step 1: Write failing test for “prefill price from sku.price”**

Create `src/features/sale-orders/components/SaleOrderItemEditorModal.spec.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaleOrderItemEditorModal } from "@/features/sale-orders/components/SaleOrderItemEditorModal";

vi.mock("@/shared/services/packService", () => ({
  listPacks: vi.fn(async () => ({ items: [] })),
  getPackById: vi.fn(async () => ({ pack: { description: "Pack X" }, items: [] })),
}));

vi.mock("@/shared/services/skuService", () => ({
  listSkus: vi.fn(async () => ({
    items: [
      {
        sku: { id: "sku-1", name: "Producto 1", backendSku: "B1", customSku: null, price: 12.5 },
        attributes: [],
        unit: { id: "u1", name: "UND", code: "UND" },
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
  })),
}));

describe("SaleOrderItemEditorModal - add catalog SKU", () => {
  it("prefills unit price from sku.price and adds component row", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SaleOrderItemEditorModal
        open
        title="Editar"
        value={{ description: "X", quantity: 1, unitPrice: 0, total: 0, referencePackId: "pack-1", components: [] }}
        onChange={onChange}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );

    // open add sku modal
    const addBtn = screen.getByTitle("Agregar SKU");
    await user.click(addBtn);

    // open select and search
    const selectTrigger = screen.getByRole("button", { name: "Producto" });
    await user.click(selectTrigger);
    const search = screen.getByRole("textbox", { name: "Buscar Producto" });
    await user.type(search, "prod");

    // select option (mousedown required by FloatingSelect)
    const option = await screen.findByRole("option", { name: /Producto 1/i });
    fireEvent.mouseDown(option);

    // unit price should be prefilled
    const priceInput = screen.getByLabelText("Precio unit.") as HTMLInputElement;
    expect(priceInput.value).toContain("12.5");

    // add
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onChange).toHaveBeenCalled();
  });
});
```

Expected: FAIL initially because modal integration/caching not yet complete (until Tasks 1–2 are implemented).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm.cmd test:unit -- src/features/sale-orders/components/SaleOrderItemEditorModal.spec.tsx`
Expected: FAIL (missing file / assertions not met).

- [ ] **Step 3: Adjust mocks/assertions until test reflects real DOM**

If `Modal` portals content, prefer queries via `screen` (already searches `document.body`).

If the `+` button is not accessible by `title`, add `aria-label` to it in implementation (Task 2) and change test to:

```tsx
const addBtn = screen.getByRole("button", { name: "Agregar SKU" });
```

- [ ] **Step 4: Re-run tests**

Run: `pnpm.cmd test:unit -- src/features/sale-orders/components/SaleOrderItemEditorModal.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/sale-orders/components/SaleOrderItemEditorModal.spec.tsx
git commit -m "test(sale-orders): cover adding catalog SKU in item editor"
```

---

## Plan Self-Review

- Spec coverage:
  - Búsqueda `listSkus` + labels: Task 1.
  - Prefill `unitPrice` desde `sku.price`: Task 1 + Task 3.
  - Insertar en `value.components` con recálculo: Task 2.
  - Cache de label para no-pack SKUs: Task 2.
  - Remover `skuId` de `excludedSkuIds` al agregar: Task 2.
- Placeholder scan: No TODO/TBD en pasos.
- Type consistency: `SaleOrderAddSkuSelection` usa `skuId/label/unitPrice/quantity` y se mapea a `SaleOrderItemComponentInput` en Task 2.
