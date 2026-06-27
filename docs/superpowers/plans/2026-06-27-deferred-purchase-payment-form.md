# Deferred Purchase Payment Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an intermediate payment-form chooser for existing purchases that were created without payment setup.

**Architecture:** Reuse `PurchasePaymentModal` from the purchase form and persist the selected setup through the existing `updatePurchaseOrder` service. Keep the existing list modals as the final destination after setup is saved.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

---

### Task 1: Purchase List Deferred Payment Setup

**Files:**
- Modify: `src/features/purchases/pages/PurchaseListPage.test.tsx`
- Modify: `src/features/purchases/pages/PurchaseListPage.tsx`

- [ ] Write a failing test where a purchase with no `paymentForm` opens `PurchasePaymentModal` from the `Pagos` action.
- [ ] Run the focused test and confirm it fails because the setup modal is missing.
- [ ] Import `PurchasePaymentModal` and `updatePurchaseOrder`.
- [ ] Add state for the selected purchase setup draft.
- [ ] Route the `Pagos` action: if `paymentForm` is empty, open setup; otherwise use the current behavior.
- [ ] Save setup with `updatePurchaseOrder`, refresh purchases, and open payments or quotas based on the selected form.
- [ ] Run focused tests and build.
