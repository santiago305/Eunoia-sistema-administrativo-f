# Purchase Payments Voucher Preview Design

## Goal

Clean up the purchase payment flow so purchases can be created without forcing payment data, cash remains the default payment method, non-cash payments can optionally attach a voucher with preview, and purchase photos are only requested after the purchase is completed.

## Approved Behavior

- New payment rows default to `EFECTIVO`.
- Cash payments do not show or require a voucher input.
- Non-cash payments show an optional voucher drop zone.
- Voucher selection supports click-to-select and drag-and-drop.
- Image vouchers show an immediate preview.
- Non-image files show file name, type, and size.
- When a saved payment returns a `paymentId`, the voucher uploads as `PAYMENT_PROOF` associated to that payment.
- Opening payments from the purchases action popover respects the purchase `paymentForm`:
  - `CONTADO` opens the payment list/payment flow.
  - `CREDITO` opens quotas first and keeps the existing quota payment flow.
- Purchase photo upload from details is only available when the purchase is already `RECEIVED`.

## Scope

Frontend only. Existing backend endpoints already support creating payments and uploading purchase attachments. The implementation will not change payment approval rules, quota calculation rules, or fiscal document storage semantics.

## Files

- `src/features/purchases/components/PaymentModal.tsx`
- `src/features/purchases/components/PaymentListModal.tsx`
- `src/features/purchases/components/PurchaseDetailsModal.tsx`
- `src/features/purchases/utils/purchaseDetailsMapper.tsx`
- Focused tests near the changed components.

## Testing

Use Vitest and React Testing Library. Cover voucher visibility, image preview, non-image fallback, and purchase photo gating by status.
