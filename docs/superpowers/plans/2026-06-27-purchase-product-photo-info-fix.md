# Purchase Product Photo Info Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make purchase product photos upload once, appear in purchase info with the existing image preview, and stay separate from fiscal documents.

**Architecture:** Keep product photos as `PRODUCT_PHOTO` attachments for storage, but map the first product-photo attachment back into `imageProdution` in purchase detail output so existing info UI can render it. Enforce one product photo at the backend upload endpoint and keep the frontend upload button hidden once the detail has an image.

**Tech Stack:** NestJS/Jest backend, React/Vitest frontend, existing `OperationImageGallery` and `ImagePreviewModal` components.

---

### Task 1: Backend detail returns product photo attachment as purchase image

**Files:**
- Modify: `Eunoia-sistema-administrativo-b/src/modules/purchases/adapters/in/controllers/purchase-order.controller.ts`
- Test: `Eunoia-sistema-administrativo-b/src/modules/purchases/adapters/in/controllers/purchase-order.controller.spec.ts`

- [ ] Add failing test: when order `imageProdution` is empty but a `PRODUCT_PHOTO` attachment exists, `getById` returns `imageProdution` with that attachment URL.
- [ ] Run focused Jest test and confirm it fails because image list is empty.
- [ ] Inject/query purchase attachments in the detail flow or map saved `PRODUCT_PHOTO` attachment into order image output, following existing attachment module patterns.
- [ ] Re-run focused backend test.

### Task 2: Backend rejects second product photo

**Files:**
- Modify: `Eunoia-sistema-administrativo-b/src/modules/purchases/adapters/in/controllers/purchase-order.controller.ts`
- Test: `Eunoia-sistema-administrativo-b/src/modules/purchases/adapters/in/controllers/purchase-order.controller.spec.ts`

- [ ] Add failing test: upload product photo returns an error when either legacy `imageProdution` or existing `PRODUCT_PHOTO` attachment already exists.
- [ ] Run focused Jest test and confirm it fails because a duplicate upload is accepted.
- [ ] Add duplicate detection before upload.
- [ ] Re-run focused backend test.

### Task 3: Frontend info uses current detail image and keeps documents fiscal-only

**Files:**
- Modify: `Eunoia-sistema-administrativo-f/src/features/purchases/components/PurchaseDetailsModal.tsx`
- Modify: `Eunoia-sistema-administrativo-f/src/features/purchases/utils/purchaseDetailsMapper.tsx`
- Test: `Eunoia-sistema-administrativo-f/src/features/purchases/components/PurchaseDetailsModal.test.tsx`

- [ ] Add failing test: after a successful upload response with `imageProdution`, the info modal renders the image gallery instead of the empty message without needing a fiscal document.
- [ ] Run focused Vitest and confirm it fails.
- [ ] Update local detail state immediately from upload response and then refresh; keep upload available only when no image exists.
- [ ] Re-run focused frontend test.

### Task 4: Verification

- [ ] Run focused frontend purchase tests.
- [ ] Run focused backend purchase tests.
- [ ] Run frontend build if touched types require it.
- [ ] Run backend build if controller/usecase signatures changed.
