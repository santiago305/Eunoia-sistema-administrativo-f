# Payments module redesign contract

Date: 2026-07-13

Branch: `feature/payments-audit-contract`

Scope: `/pagos`, `/cuentas-por-pagar`, `/cuentas-pago`, `/metodos-pago`, purchase payment entry points, backend payments domain, accounts payable, company payment accounts, payment methods, evidence, permissions, search and export.

## Objective

Rebuild the payments area so it behaves as a first-class administration module: same visual system as providers, purchases and dashboards; server-side data contracts; smart filters; saved searches; modal-based workflows; permission-aware actions; auditable business rules; and no native prompts or raw HTML controls in payment workflows.

This file is the contract for the implementation branches that follow. Any implementation that changes a field name, endpoint shape, status transition or permission must update this contract in the same branch.

## Current Sources Reviewed

Frontend:

- `src/features/payments/Payments.tsx`
- `src/features/payments/pages/AccountsPayablePage.tsx`
- `src/features/payments/pages/PaymentAccountsPage.tsx`
- `src/features/payments/components/RegisterPayablePaymentModal.tsx`
- `src/features/payments/components/SchedulePaymentModal.tsx`
- `src/features/payments/components/CompanyPaymentAccountFormModal.tsx`
- `src/features/payments/types/payable.types.ts`
- `src/features/payments/types/payment-account.types.ts`
- `src/features/payment-methods/PaymentMethodsPage.tsx`
- `src/features/payment-methods/components/PaymentMethodFormModal.tsx`
- `src/features/payment-methods/types/paymentMethod.ts`
- `src/shared/components/table/DataTable.tsx`
- `src/shared/components/table/search/*`
- `src/shared/services/paymentService.ts`
- `src/shared/services/accountsPayableService.ts`
- `src/shared/services/companyPaymentAccountService.ts`
- `src/shared/services/paymentMethodService.ts`
- `src/routes/config/routesConfig.ts`
- `src/shared/config/sidebarConfig.tsx`

Backend:

- `src/modules/payments/adapters/in/controllers/payment.controller.ts`
- `src/modules/payments/adapters/in/dtos/payment/http-payment-create.dto.ts`
- `src/modules/payments/adapters/in/dtos/payment/http-payment-list.dto.ts`
- `src/modules/payments/application/dtos/payment/output/payment.output.ts`
- `src/modules/payments/application/usecases/payment/*`
- `src/modules/payments/adapters/out/persistence/typeorm/entities/payment-document.entity.ts`
- `src/modules/accounts-payable/adapters/in/controllers/accounts-payable.controller.ts`
- `src/modules/accounts-payable/application/usecases/*`
- `src/modules/payment-methods/adapters/in/controllers/payment-method.controller.ts`
- `src/modules/company-payment-accounts/adapters/in/controllers/company-payment-accounts.controller.ts`
- `src/modules/access-control/application/constants/permissions-seed.ts`

## Module Boundaries

The payments module is not a passive table. It coordinates these bounded areas:

- Payments: records money movement and approval status.
- Accounts payable: tracks obligations, due dates, paid amount and pending amount.
- Company payment accounts: stores bank accounts, cards, cash boxes and digital wallets used to pay.
- Payment methods: catalog and assignment layer, including voucher requirements.
- Purchases: source document for purchase payments and approval-history notifications.
- Evidence: attachments or file references proving a payment.
- Access control: decides page access, action visibility and sensitive data exposure.

The frontend must not duplicate payment business rules that the backend can enforce. The frontend may preview outcomes and disable impossible actions, but the backend remains authoritative.

## Payment Entity Contract

Canonical output shape for a payment row and detail:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `payDocId` | uuid | yes | Public payment identifier used by routes and actions. |
| `method` | string | yes | Legacy text label. Must be derived from `paymentMethodId` when available. |
| `paymentMethodId` | uuid | no | Catalog method selected for the payment. |
| `date` | ISO date-time | yes | Accounting payment date. |
| `scheduledAt` | ISO date-time | no | Planned payment date for scheduled payments. |
| `paidAt` | ISO date-time | no | Actual execution date. |
| `operationNumber` | string | no | External operation number. |
| `operationCode` | string | no | Bank/app operation code. |
| `currency` | enum | yes | Existing `CurrencyType`. |
| `amount` | number | yes | Positive value, minimum `0.01`. |
| `note` | string | no | Human note, maximum length follows backend DTO/domain. |
| `fromDocumentType` | enum | yes | Existing `PayDocType`. |
| `poId` | uuid | no | Purchase order origin. |
| `quotaId` | uuid | no | Credit quota origin. |
| `accountPayableId` | uuid | no | Obligation affected by payment. |
| `companyPaymentAccountId` | uuid | no | Company account/card/cash/wallet used. |
| `companyPaymentAccountMaskedLabel` | string | no | Display label safe for users without sensitive permission. |
| `status` | enum | yes | `SCHEDULED`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`. |
| `requestedByUserId` | uuid | no | User who created/requested the payment. |
| `scheduledByUserId` | uuid | no | User who scheduled it. |
| `approvedByUserId` | uuid | no | User who approved it. |
| `rejectedByUserId` | uuid | no | User who rejected it. |
| `paidByUserId` | uuid | no | User who executed/confirmed payment. |
| `approvedAt` | ISO date-time | no | Approval timestamp. |
| `rejectedAt` | ISO date-time | no | Rejection timestamp. |
| `rejectionReason` | string | no | Required by UI when rejecting. Backend stores nullable for legacy rows. |
| `paymentEvidenceFileId` | uuid | no | Linked evidence file. |
| `bankName` | string | no | Captured when method/account requires bank context. |
| `cardLastFour` | string | no | Only last four digits. Full card numbers are not stored here. |
| `isPartial` | boolean | yes | True when payment does not settle full payable/quota amount. |

## Payment Status Contract

Allowed statuses:

- `SCHEDULED`: payment has a future planned date and no execution date.
- `PENDING_APPROVAL`: payment was requested by a user who cannot approve it.
- `APPROVED`: payment is valid for accounting balances and payable recalculation.
- `REJECTED`: payment request was denied and must not affect paid totals.

Allowed transitions:

| From | To | Permission | Backend behavior |
| --- | --- | --- | --- |
| new request | `APPROVED` | `payments.create` and `payments.approve` | Create payment, set approver fields, recalculate payable when linked. |
| new request | `PENDING_APPROVAL` | `payments.create` without `payments.approve` | Create request, create approval/history events, notify approvers. |
| new scheduled | `SCHEDULED` | `payments.create` and `payments.schedule` | Create scheduled payment with `scheduledAt` and no `paidAt`. |
| `PENDING_APPROVAL` | `APPROVED` | `payments.approve` | Set approval and paid fields, update quota/payable, notify requester. |
| `SCHEDULED` | `APPROVED` | `payments.approve` | Execute scheduled payment, set approval and paid fields, update balances. |
| `PENDING_APPROVAL` | `REJECTED` | `payments.reject` | Store rejection metadata, history and notification. |

Forbidden transitions:

- `APPROVED` to `REJECTED`.
- `REJECTED` to `APPROVED`.
- `REJECTED` to `PENDING_APPROVAL`.
- Delete as a substitute for rejection.
- Any transition that updates paid balances without recalculating linked `accountPayableId` or quota.

## Payment Create Contract

Endpoint: `POST /payments`

Required input:

- `method`
- `date`
- `currency`
- `amount`

Optional input:

- `operationNumber`
- `note`
- `quotaId`
- `poId`
- `accountPayableId`
- `companyPaymentAccountId`
- `paymentMethodId`
- `scheduledAt`
- `paidAt`
- `paymentEvidenceFileId`
- `bankName`
- `cardLastFour`
- `operationCode`
- `isPartial`

Validation rules:

- `amount` must be greater than or equal to `0.01`.
- `scheduledAt` without `paidAt` creates a scheduled payment.
- If `paymentMethodId` points to a method with `requiresVoucher`, the UI must require evidence before submission. Backend must enforce the same rule in the evidence branch.
- A payment tied to `accountPayableId` cannot exceed the pending balance unless the backend explicitly supports overpayment in a later contract revision.
- A user without `payments.approve` cannot create payments for purchases in `PENDING` or `REJECTED` approval states.
- Full card numbers and sensitive account numbers must not be sent through payment creation. Use `companyPaymentAccountId` and display masked labels.

Response:

```ts
type PaymentMutationResponse = {
  type: "success" | "error";
  message: string;
  paymentId?: string;
};
```

## Payment List Contract

Endpoint: `GET /payments`

Current filters:

- `poId`
- `quotaId`
- `status`
- `page`
- `limit`

Required target filters for implementation:

| Query field | Type | Behavior |
| --- | --- | --- |
| `statuses` | string[] | Multi-status filter. Keep `status` as backwards-compatible single alias. |
| `poId` | uuid | Exact purchase filter. |
| `quotaId` | uuid | Exact quota filter. |
| `accountPayableId` | uuid | Exact payable filter. |
| `companyPaymentAccountId` | uuid | Exact company account filter. |
| `paymentMethodId` | uuid | Exact payment method filter. |
| `requestedByUserId` | uuid | User who requested payment. |
| `approvedByUserId` | uuid | User who approved payment. |
| `dateFrom` | ISO date | Inclusive payment date start. |
| `dateTo` | ISO date | Inclusive payment date end. |
| `scheduledFrom` | ISO date | Inclusive scheduled date start. |
| `scheduledTo` | ISO date | Inclusive scheduled date end. |
| `amountMin` | number | Inclusive minimum amount. |
| `amountMax` | number | Inclusive maximum amount. |
| `currency` | enum | Exact currency. |
| `hasEvidence` | boolean | Presence of `paymentEvidenceFileId`. |
| `isPartial` | boolean | Exact partial-payment flag. |
| `search` | string | Matches operation number, operation code, note, method, masked account label and purchase-facing identifiers. |
| `sortBy` | enum | `date`, `scheduledAt`, `amount`, `status`, `createdAt`. |
| `sortDirection` | enum | `asc` or `desc`. |
| `page` | number | Starts at 1. |
| `limit` | number | Maximum 100. |

Response:

```ts
type ListPaymentsResponse = {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
};
```

Repository signature must include `SCHEDULED` in the status type everywhere.

## Accounts Payable Contract

Entity fields used by frontend:

- `accountPayableId`
- `purchaseId`
- `quotaId`
- `supplierId`
- `description`
- `currency`
- `amountTotal`
- `amountPaid`
- `amountPending`
- `dueDate`
- `status`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Statuses:

- `PENDING`: no payment has been approved.
- `PARTIAL`: approved payments exist and pending amount remains.
- `PAID`: pending amount is zero.
- `OVERDUE`: due date passed and pending amount remains.
- `CANCELLED`: obligation no longer active.

Endpoints:

- `GET /accounts-payable`
- `POST /accounts-payable/mark-overdue`

Current filters:

- `status`
- `purchaseId`
- `page`
- `limit`

Required target filters:

- `statuses`
- `purchaseId`
- `supplierId`
- `dueFrom`
- `dueTo`
- `amountPendingMin`
- `amountPendingMax`
- `currency`
- `search`
- `page`
- `limit`

Business rules:

- Only `APPROVED` payments affect `amountPaid` and `amountPending`.
- `PENDING_APPROVAL`, `SCHEDULED` and `REJECTED` payments must not reduce pending amount.
- Registering payment from `/cuentas-por-pagar` must create a payment linked by `accountPayableId`.
- Partial payments must not mark a payable as `PAID`.
- `mark-overdue` only changes obligations with pending balance and due date before current business date.

## Company Payment Account Contract

Supported account types:

- `BANK_ACCOUNT`
- `CREDIT_CARD`
- `CASH`
- `DIGITAL_WALLET`

Fields:

- `id`
- `companyId`
- `type`
- `name`
- `bankName`
- `accountNumber`
- `accountLastFour`
- `cardLastFour`
- `walletName`
- `currency`
- `isActive`
- `isDefault`
- `maskedLabel`

Endpoints:

- `POST /company-payment-accounts`
- `GET /company-payment-accounts/by-company/:companyId`
- `PATCH /company-payment-accounts/:id`
- `PATCH /company-payment-accounts/:id/active`

Business rules:

- UI must show `maskedLabel` by default.
- Raw `accountNumber` is sensitive and must be hidden unless backend authorizes `payment_accounts.view_sensitive`.
- Only one default account per company/currency/type combination should remain active after setting a new default.
- Inactive accounts cannot be selected for new payments.
- Deactivation must be blocked or warned if there are scheduled payments using the account.

## Payment Method Contract

Fields:

- `methodId`
- `name`
- `isActive`
- `requiresVoucher`
- `createdAt`
- `updatedAt`

Endpoints:

- `POST /payment-methods`
- `GET /payment-methods`
- `GET /payment-methods/records`
- `GET /payment-methods/by-company/:companyId`
- `GET /payment-methods/by-supplier/:supplierId`
- `GET /payment-methods/:id`
- `PATCH /payment-methods/:id`
- `PATCH /payment-methods/:id/active`

Filters:

- `name`
- `isActive`
- `page`
- `limit`

Business rules:

- Inactive methods cannot be used for new payments.
- `requiresVoucher` drives evidence requirement in payment forms.
- Supplier and company method assignments can override defaults for operational selection, but the base method remains the catalog source of truth.

## Evidence Contract

Payment evidence is represented today by `paymentEvidenceFileId`. The target implementation must expose a complete viewer/uploader flow without breaking this field.

Required behavior:

- Users with `payments.attach_evidence` can attach evidence before or after payment creation.
- Users with `payments.view_evidence` can open the evidence viewer.
- A payment method with `requiresVoucher` requires evidence before approval or direct approved creation.
- Evidence attached from a purchase payment modal must be visible from `/pagos`.
- Evidence attached from `/pagos` must remain associated with the purchase when `poId` exists.
- The UI must show an explicit "Sin evidencia" state when no file exists and the user can view evidence.

Target endpoints for later implementation:

- `POST /payments/:id/evidence`
- `GET /payments/:id/evidence`
- `DELETE /payments/:id/evidence/:fileId`

These endpoints must require payment permissions, not only purchase attachment permissions.

## Permissions Contract

Page permissions:

| Route | Required page permission | Required data permission |
| --- | --- | --- |
| `/pagos` | `page.payments.view` | `payments.read` |
| `/cuentas-por-pagar` | `page.accounts-payable.view` | `accounts-payable.view` |
| `/cuentas-pago` | `page.payment-accounts.view` | `payment_accounts.view` |
| `/metodos-pago` | existing route config | `payment-methods.read` |

Action permissions:

| Permission | UI behavior | Backend behavior |
| --- | --- | --- |
| `payments.read` | Can list and open details. | Allows `GET /payments` and payment detail endpoints. |
| `payments.create` | Shows create payment action. | Allows `POST /payments`. |
| `payments.schedule` | Shows schedule payment action. | Required when creating `SCHEDULED` payments. |
| `payments.approve` | Shows approve action and allows direct approved creation. | Allows `POST /payments/:id/approve`. |
| `payments.reject` | Shows reject action. | Allows `POST /payments/:id/reject`. |
| `payments.delete` | Shows delete action where allowed. | Allows `DELETE /payments/:id`. |
| `payments.attach_evidence` | Shows upload/replace evidence actions. | Allows evidence mutation endpoints. |
| `payments.view_evidence` | Shows evidence viewer action. | Allows evidence read endpoint. |
| `payments.view_all` | Allows all-user views. | Backend may return all payment records. |
| `payments.view_own` | Allows own/requested view. | Backend restricts list to own/requested payments when no `view_all`. |
| `payments.export` | Shows export action. | Allows export endpoints. |
| `accounts-payable.view` | Can list payables. | Allows `GET /accounts-payable`. |
| `accounts-payable.manage` | Can register payable payments. | Required for payable management workflows. |
| `accounts-payable.mark_overdue` | Shows mark overdue action. | Allows `POST /accounts-payable/mark-overdue`. |
| `payment_accounts.view` | Can list company payment accounts. | Allows list endpoint. |
| `payment_accounts.create` | Shows create account action. | Allows create endpoint. |
| `payment_accounts.edit` | Shows edit action. | Allows patch endpoint. |
| `payment_accounts.disable` | Shows activate/deactivate action. | Allows active endpoint. |
| `payment_accounts.view_sensitive` | Can reveal sensitive values. | Backend may include unmasked sensitive data. |
| `payment-methods.read` | Can list/open methods. | Allows read endpoints. |
| `payment-methods.manage` | Shows create/edit/active actions. | Allows mutation endpoints. |

Frontend action visibility and backend guards must use the same permission names.

## UI Contract

Shared UI requirements:

- Use `PageShell` for page structure.
- Use `DataTable` for tabular surfaces.
- Use `DataTableSearchBar`, `DataTableSearchChips` and smart search panel components for advanced filters.
- Use existing modal, floating input/select and system button components.
- Use action menus/popovers for row actions when there are more than two actions.
- Use `useFeedbackToast` for mutation feedback.
- Do not use `window.prompt`, `window.confirm`, raw `input` or raw `select` in final payment workflows.
- Table columns must be hideable where useful, with stable IDs for future saved views.
- Empty states must be business-specific and actionable.

`/pagos` target sections:

- Header with title, subtitle, create payment, schedule payment and export actions.
- Summary metrics: total amount, pending approval, scheduled, rejected, missing evidence.
- Smart search bar with chips.
- Saved metrics/recent searches if search-state endpoints are available.
- Data table with status, date, amount, method, company account, purchase/payable reference, evidence, requester, approver and actions.
- Detail modal or side panel for full audit trail.

`/cuentas-por-pagar` target sections:

- Header with mark overdue action gated by permission.
- Summary metrics: total pending, overdue, due this week, partial.
- Smart search for status, supplier, purchase, due date and amount.
- Table with payable status, due date, total, paid, pending, purchase, supplier and payment action.
- Register payment modal linked to `accountPayableId`.

`/cuentas-pago` target sections:

- Header with create account action.
- Filters by type, currency, active state and default state.
- Table with account type, name, bank/wallet, masked label, currency, active/default state and actions.
- Create/edit modal with conditional fields by type.
- Sensitive data must be masked unless permission allows reveal.

`/metodos-pago` target sections:

- Header with create method action.
- Filters by name, active state and voucher requirement.
- Table with method name, `requiresVoucher`, active state and actions.
- Create/edit modal using existing payment method form components.

## Smart Search Contract

The payment smart search field registry must define these fields:

- Estado
- Fecha de pago
- Fecha programada
- Monto
- Moneda
- Metodo de pago
- Cuenta de pago
- Cuenta por pagar
- Orden de compra
- Evidencia
- Parcial
- Solicitante
- Aprobador
- Texto

Search chips must serialize into the query contract in `Payment List Contract`.

Saved search metrics must persist:

- `key`
- `label`
- `module = payments`
- `filters`
- `createdByUserId`
- `createdAt`

Recent searches must keep the last meaningful payment searches per user and company.

## Export Contract

Export is implemented in a later branch but the UI/API contract is:

- `GET /payments/export-columns`
- `GET /payments/export-presets`
- `POST /payments/export-excel`

Export must:

- Require `payments.export`.
- Respect all active filters.
- Export only allowed columns for the current user's permissions.
- Mask company payment account sensitive values unless `payment_accounts.view_sensitive`.
- Include evidence presence, not raw file content.

## Backend Architecture Contract

Required direction for implementation branches:

- Move approval and rejection logic out of `PaymentsController` into use cases.
- Keep controllers responsible for guards, DTO mapping and use case invocation.
- Keep `CreatePaymentUsecase` responsible for persistence and domain validation.
- Keep payable recalculation in `RecalculateAccountPayableUsecase`.
- Add focused tests for each use case changed.
- Preserve legacy endpoints until frontend migration is complete.
- Avoid creating frontend-only rules that can be bypassed by direct API calls.

## Test Contract

Frontend target tests:

- Payment status view/action visibility.
- Payment smart search serialization.
- Payments page action rendering by permission.
- Accounts payable payment registration modal validation.
- Payment accounts sensitive masking behavior.
- Payment methods page CRUD action visibility.

Backend target tests:

- Payment list filters include `SCHEDULED` and advanced filters.
- Create payment direct approval versus pending approval.
- Approve scheduled and pending payments.
- Reject pending payments with reason.
- Payable recalculation after approved payment.
- Company payment account sensitive output masking.
- Payment method `requiresVoucher` policy.
- Permission guard tests for payment actions.

## Acceptance Criteria For The Full Redesign

- `/pagos` can search, filter, create, schedule, approve, reject, delete, evidence and export according to permissions.
- `/cuentas-por-pagar` can manage obligations, overdue state, partial payments and balances.
- `/cuentas-pago` can create, edit, activate/deactivate and display accounts safely.
- `/metodos-pago` is a real CRUD page, not a placeholder.
- Backend list endpoints support server-side filters needed by smart search.
- Backend actions are use-case based and tested.
- UI matches the existing system components and avoids raw ad hoc controls.
- Permission names are consistent across route config, buttons and backend guards.
- Evidence rules are enforced both in UI and API.
- Sensitive payment account data is never exposed without explicit permission.
