# Purchase Payments Voucher Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve purchase payments with optional voucher preview for non-cash methods and correct purchase photo availability.

**Architecture:** Keep payment creation in `PaymentModal`, attachment upload in the existing `uploadPurchaseAttachment` service, and status gating in the purchase detail mapper inputs. Avoid backend changes and reuse current purchase attachment types.

**Tech Stack:** Vite, React, TypeScript, Vitest, React Testing Library, existing shared UI components.

---

### Task 1: Voucher Preview In Payment Modal

**Files:**
- Modify: `src/features/purchases/components/PaymentModal.tsx`
- Test: `src/features/purchases/components/PaymentModal.test.tsx`

- [ ] **Step 1: Write failing tests**

Add tests proving that cash hides voucher input, non-cash shows it, and image selection renders a preview.

- [ ] **Step 2: Run test to verify red**

Run: `pnpm test:unit -- src/features/purchases/components/PaymentModal.test.tsx`

Expected: FAIL because preview UI is not implemented.

- [ ] **Step 3: Implement minimal code**

Add a file drop/select block shown only when `form.method !== PaymentTypes.EFECTIVO`, create an object URL for image preview, revoke it on change/unmount, and keep upload behavior in `handleSave`.

- [ ] **Step 4: Run test to verify green**

Run: `pnpm test:unit -- src/features/purchases/components/PaymentModal.test.tsx`

Expected: PASS.

### Task 2: Payment Flow From Purchase Actions

**Files:**
- Modify: `src/features/purchases/pages/PurchaseListPage.tsx`
- Test: `src/features/purchases/pages/PurchaseListPage.test.tsx`

- [ ] **Step 1: Write failing test**

Add or update a test proving the action flow opens payments for `CONTADO` and quotas for `CREDITO`.

- [ ] **Step 2: Run test to verify red**

Run: `pnpm test:unit -- src/features/purchases/pages/PurchaseListPage.test.tsx`

Expected: FAIL if current actions do not expose the intended flow.

- [ ] **Step 3: Implement minimal code**

Ensure payment actions set `paymentForm`, `poId`, totals, and modal state consistently. For credit purchases, open quota flow first and keep payment list as a secondary listing action.

- [ ] **Step 4: Run test to verify green**

Run: `pnpm test:unit -- src/features/purchases/pages/PurchaseListPage.test.tsx`

Expected: PASS.

### Task 3: Gate Purchase Photo Upload By Status

**Files:**
- Modify: `src/features/purchases/components/PurchaseDetailsModal.tsx`
- Test: `src/features/purchases/components/PurchaseDetailsModal.test.tsx`

- [ ] **Step 1: Write failing test**

Add tests proving upload photo is not available for `DRAFT` and is available for `RECEIVED` when there are no images and permissions allow it.

- [ ] **Step 2: Run test to verify red**

Run: `pnpm test:unit -- src/features/purchases/components/PurchaseDetailsModal.test.tsx`

Expected: FAIL because status gating is currently missing.

- [ ] **Step 3: Implement minimal code**

Require `purchase.status === PurchaseOrderStatuses.RECEIVED` in `canUploadMissingPhoto`.

- [ ] **Step 4: Run test to verify green**

Run: `pnpm test:unit -- src/features/purchases/components/PurchaseDetailsModal.test.tsx`

Expected: PASS.

### Task 4: Final Verification

**Files:**
- Existing changed files only.

- [ ] **Step 1: Run focused tests**

Run: `pnpm test:unit -- src/features/purchases/components/PaymentModal.test.tsx src/features/purchases/components/PurchaseDetailsModal.test.tsx src/features/purchases/pages/PurchaseListPage.test.tsx`

- [ ] **Step 2: Run relevant broader tests**

Run: `pnpm test:unit -- test/purchase-pages-routing.spec.ts test/purchase-detail-tabs.spec.ts`

- [ ] **Step 3: Inspect diff**

Run: `git diff -- src/features/purchases docs/superpowers`

Confirm only planned files changed.
