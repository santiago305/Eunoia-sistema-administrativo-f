# Deferred Purchase Payment Form Design

## Goal
When a purchase is created without choosing a payment form, the list action must ask whether the payment is cash or credit before opening the existing payment or quota flow.

## Design
- Purchases with `paymentForm` already set keep the current behavior: `CONTADO` opens the payment list and `CREDITO` opens quotas.
- Purchases with no `paymentForm` open `PurchasePaymentModal` as an intermediate setup step.
- Saving that modal patches the existing purchase with `paymentForm`, `payments`, `quotas`, `creditDays`, and `numQuotas`.
- After saving, `CONTADO` opens `PaymentListModal`; `CREDITO` opens `QuotaListModal`.

## Testing
- Add a frontend regression test for a purchase with missing `paymentForm`.
- Verify focused purchase tests and build.
